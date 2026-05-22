import { describe, it, expect, mock, beforeAll, afterEach, afterAll } from 'bun:test'
import { generateKeyPair, SignJWT } from 'jose'
import { db } from '../../config/db'
import { client } from '../../config/redis'

const { privateKey: testPrivateKey, publicKey: testPublicKey } = await generateKeyPair('RS256')

mock.module('../../config/clerk', () => ({
  getClerkPublicKey: async () => testPublicKey,
}))

process.env.CLERK_AUTHORIZED_PARTY = 'http://localhost:3000'
process.env.API_TOKEN = 'test-api-token'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_cache_soi_${Date.now()}`
const CACHE_KEY = `sources_of_income:list:${TEST_EXTERNAL_ID}`
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

let test_category_id: string

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID } })
  const catRes = await req('POST', '/api/v1/categories', { name: `cache-soi-cat-${TS}` })
  test_category_id = (await catRes.json()).id
})

afterEach(async () => {
  await client.del(CACHE_KEY)
  await db.sourceOfIncome.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
})

afterAll(async () => {
  await db.sourceOfIncomeCategory.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Sources of income cache', () => {
  it('GET /api/v1/sources_of_income populates the per-user cache', async () => {
    await req('POST', '/api/v1/sources_of_income', {
      name: `cache-soi-${TS}-populate`,
      category_id: Number(test_category_id),
    })
    await req('GET', '/api/v1/sources_of_income')
    const cached = await client.get(CACHE_KEY)
    expect(cached).not.toBeNull()
    const parsed = JSON.parse(cached!) as Record<
      string,
      { id: string; name: string; income: number }[]
    >
    expect(typeof parsed).toBe('object')
    expect(Array.isArray(parsed)).toBe(false)
    const category_names = Object.keys(parsed)
    expect(category_names.length).toBeGreaterThan(0)
    for (const key of category_names) {
      expect(Array.isArray(parsed[key])).toBe(true)
    }
    const all_sources = Object.values(parsed).flat()
    const first_source = all_sources[0]
    expect(typeof first_source.id).toBe('string')
    expect(typeof first_source.name).toBe('string')
    expect(typeof first_source.income).toBe('number')
  })

  it('POST /api/v1/sources_of_income invalidates the cache', async () => {
    await req('GET', '/api/v1/sources_of_income')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('POST', '/api/v1/sources_of_income', {
      name: `cache-soi-${TS}-create`,
      category_id: Number(test_category_id),
    })
    expect(await client.get(CACHE_KEY)).toBeNull()
  })

  it('PATCH /api/v1/sources_of_income/:id invalidates the cache', async () => {
    const created = await (
      await req('POST', '/api/v1/sources_of_income', {
        name: `cache-soi-${TS}-patch`,
        category_id: Number(test_category_id),
      })
    ).json()
    await req('GET', '/api/v1/sources_of_income')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('PATCH', `/api/v1/sources_of_income/${created.id}`, {
      name: `cache-soi-${TS}-patched`,
    })
    expect(await client.get(CACHE_KEY)).toBeNull()
  })

  it('DELETE /api/v1/sources_of_income/:id invalidates the cache', async () => {
    const created = await (
      await req('POST', '/api/v1/sources_of_income', {
        name: `cache-soi-${TS}-del`,
        category_id: Number(test_category_id),
      })
    ).json()
    await req('GET', '/api/v1/sources_of_income')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('DELETE', `/api/v1/sources_of_income/${created.id}`)
    expect(await client.get(CACHE_KEY)).toBeNull()
  })
})
