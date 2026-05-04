import { describe, it, expect, beforeAll, afterEach, afterAll } from 'bun:test'
import { app } from '../../index'
import { db } from '../../config/db'
import { client } from '../../config/redis'

const TS = Date.now()
const AUTH_TOKEN = 'test-token-cache-cat'
const CACHE_KEY = 'categories:list'

const req = (method: string, path: string, body?: unknown) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  )

beforeAll(() => {
  process.env.API_TOKEN = AUTH_TOKEN
})

afterEach(async () => {
  await client.del(CACHE_KEY)
  await db.sourceOfIncomeCategory.deleteMany({
    where: { name: { startsWith: `test-cache-cat-${TS}` } },
  })
})

afterAll(async () => {
  await db.$disconnect()
})

describe('Categories cache', () => {
  it('GET /v1/categories populates the cache', async () => {
    await req('GET', '/v1/categories')
    const cached = await client.get(CACHE_KEY)
    expect(cached).not.toBeNull()
    expect(Array.isArray(JSON.parse(cached!))).toBe(true)
  })

  it('POST /v1/categories invalidates the cache', async () => {
    await req('GET', '/v1/categories')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('POST', '/v1/categories', { name: `test-cache-cat-${TS}-create` })
    expect(await client.get(CACHE_KEY)).toBeNull()
  })

  it('PATCH /v1/categories/:id invalidates the cache', async () => {
    const created = await (
      await req('POST', '/v1/categories', { name: `test-cache-cat-${TS}-patch` })
    ).json()
    await req('GET', '/v1/categories')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('PATCH', `/v1/categories/${created.id}`, { name: `test-cache-cat-${TS}-patched` })
    expect(await client.get(CACHE_KEY)).toBeNull()
  })

  it('DELETE /v1/categories/:id invalidates the cache', async () => {
    const created = await (
      await req('POST', '/v1/categories', { name: `test-cache-cat-${TS}-del` })
    ).json()
    await req('GET', '/v1/categories')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('DELETE', `/v1/categories/${created.id}`)
    expect(await client.get(CACHE_KEY)).toBeNull()
  })
})
