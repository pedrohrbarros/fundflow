import { describe, it, expect, mock, beforeAll, afterEach, afterAll } from 'bun:test'
import { generateKeyPair, SignJWT } from 'jose'
import { db } from '../../config/db'
import { client } from '../../config/redis'
import { PAGINATION_DEFAULT_PAGE, PAGINATION_DEFAULT_LIMIT } from '../../helpers/pagination'

const { privateKey: testPrivateKey, publicKey: testPublicKey } = await generateKeyPair('RS256')

mock.module('../../config/clerk', () => ({
  getClerkPublicKey: async () => testPublicKey,
}))

process.env.CLERK_AUTHORIZED_PARTY = 'http://localhost:3000'
process.env.API_TOKEN = 'test-api-token'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_cache_cat_${Date.now()}`
const CACHE_KEY = `categories:list:${TEST_EXTERNAL_ID}:${PAGINATION_DEFAULT_PAGE}:${PAGINATION_DEFAULT_LIMIT}`
const TS = Date.now()

const makeToken = () =>
  new SignJWT({ azp: process.env.CLERK_AUTHORIZED_PARTY })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(TEST_EXTERNAL_ID)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(testPrivateKey)

const req = async (method: string, path: string, body?: unknown) => {
  const token = await makeToken()
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.API_TOKEN!,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  )
}

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID } })
})

afterEach(async () => {
  await client.del(CACHE_KEY)
  await db.sourceOfIncomeCategory.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
})

afterAll(async () => {
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Categories cache', () => {
  it('GET /api/v1/categories populates the per-user cache', async () => {
    await req('GET', '/api/v1/categories')
    const cached = await client.get(CACHE_KEY)
    expect(cached).not.toBeNull()
    const parsed = JSON.parse(cached!) as {
      categories: { id: string; name: string }[]
      pagination: { page: number; limit: number; total: number }
    }
    expect(Array.isArray(parsed.categories)).toBe(true)
    expect(typeof parsed.pagination).toBe('object')
    expect(typeof parsed.pagination.page).toBe('number')
    expect(typeof parsed.pagination.total).toBe('number')
  })

  it('POST /api/v1/categories invalidates the cache', async () => {
    await req('GET', '/api/v1/categories')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('POST', '/api/v1/categories', { name: `test-cache-cat-${TS}-create` })
    expect(await client.get(CACHE_KEY)).toBeNull()
  })

  it('PATCH /api/v1/categories/:id invalidates the cache', async () => {
    const created = await (
      await req('POST', '/api/v1/categories', { name: `test-cache-cat-${TS}-patch` })
    ).json()
    await req('GET', '/api/v1/categories')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('PATCH', `/api/v1/categories/${created.id}`, { name: `test-cache-cat-${TS}-patched` })
    expect(await client.get(CACHE_KEY)).toBeNull()
  })

  it('DELETE /api/v1/categories/:id invalidates the cache', async () => {
    const created = await (
      await req('POST', '/api/v1/categories', { name: `test-cache-cat-${TS}-del` })
    ).json()
    await req('GET', '/api/v1/categories')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('DELETE', `/api/v1/categories/${created.id}`)
    expect(await client.get(CACHE_KEY)).toBeNull()
  })
})
