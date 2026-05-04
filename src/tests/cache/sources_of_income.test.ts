import { describe, it, expect, beforeAll, afterEach, afterAll } from 'bun:test'
import { app } from '../../index'
import { db } from '../../config/db'
import { client } from '../../config/redis'

const TS = Date.now()
const AUTH_TOKEN = 'test-token-cache-soi'
const CACHE_KEY = 'sources_of_income:list'

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

let test_category_id: number

beforeAll(async () => {
  process.env.API_TOKEN = AUTH_TOKEN
  const category = await db.sourceOfIncomeCategory.create({
    data: { name: `test-cache-soi-cat-${TS}` },
  })
  test_category_id = Number(category.id)
})

afterEach(async () => {
  await client.del(CACHE_KEY)
  await db.sourceOfIncome.deleteMany({
    where: { name: { startsWith: `test-cache-soi-${TS}` } },
  })
})

afterAll(async () => {
  await db.sourceOfIncomeCategory.deleteMany({
    where: { name: `test-cache-soi-cat-${TS}` },
  })
  await db.$disconnect()
})

describe('Sources of income cache', () => {
  it('GET /v1/sources_of_income populates the cache', async () => {
    await req('GET', '/v1/sources_of_income')
    const cached = await client.get(CACHE_KEY)
    expect(cached).not.toBeNull()
    expect(Array.isArray(JSON.parse(cached!))).toBe(true)
  })

  it('POST /v1/sources_of_income invalidates the cache', async () => {
    await req('GET', '/v1/sources_of_income')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('POST', '/v1/sources_of_income', {
      name: `test-cache-soi-${TS}-create`,
      category_id: test_category_id,
    })
    expect(await client.get(CACHE_KEY)).toBeNull()
  })

  it('PATCH /v1/sources_of_income/:id invalidates the cache', async () => {
    const created = await (
      await req('POST', '/v1/sources_of_income', {
        name: `test-cache-soi-${TS}-patch`,
        category_id: test_category_id,
      })
    ).json()
    await req('GET', '/v1/sources_of_income')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('PATCH', `/v1/sources_of_income/${created.id}`, {
      name: `test-cache-soi-${TS}-patched`,
    })
    expect(await client.get(CACHE_KEY)).toBeNull()
  })

  it('DELETE /v1/sources_of_income/:id invalidates the cache', async () => {
    const created = await (
      await req('POST', '/v1/sources_of_income', {
        name: `test-cache-soi-${TS}-del`,
        category_id: test_category_id,
      })
    ).json()
    await req('GET', '/v1/sources_of_income')
    expect(await client.get(CACHE_KEY)).not.toBeNull()
    await req('DELETE', `/v1/sources_of_income/${created.id}`)
    expect(await client.get(CACHE_KEY)).toBeNull()
  })
})
