import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test'
import { generateKeyPair, SignJWT } from 'jose'
import { db } from '../../config/db'

const { privateKey: testPrivateKey, publicKey: testPublicKey } = await generateKeyPair('RS256')

mock.module('../../config/clerk', () => ({
  getClerkPublicKey: async () => testPublicKey,
}))

process.env.CLERK_AUTHORIZED_PARTY = 'http://localhost:3000'
process.env.API_TOKEN = 'test-api-token'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_soi_api_${Date.now()}`
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
  const catRes = await req('POST', '/api/v1/categories', { name: `test-soi-cat-${TS}` })
  const cat = await catRes.json()
  test_category_id = cat.id
})

afterAll(async () => {
  await db.sourceOfIncome.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.sourceOfIncomeCategory.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Sources of Income API', () => {
  it('POST /api/v1/sources_of_income creates a source of income', async () => {
    const res = await req('POST', '/api/v1/sources_of_income', {
      name: `test-soi-${TS}-create`,
      category_id: Number(test_category_id),
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe(`test-soi-${TS}-create`)
    expect(json.category_id).toBe(test_category_id)
  })

  it('GET /api/v1/sources_of_income returns sources grouped by category with pagination', async () => {
    await req('POST', '/api/v1/sources_of_income', {
      name: `test-soi-${TS}-list`,
      category_id: Number(test_category_id),
    })
    const res = await req('GET', '/api/v1/sources_of_income')
    expect(res.status).toBe(200)
    const json = await res.json()
    // Response is now wrapped: { sources_of_income: {...}, pagination: {...} }
    expect('sources_of_income' in json).toBe(true)
    expect('pagination' in json).toBe(true)
    expect(typeof json.pagination.page).toBe('number')
    expect(typeof json.pagination.limit).toBe('number')
    expect(typeof json.pagination.total).toBe('number')
    // Keys inside sources_of_income are category names (strings), values are arrays
    const category_names = Object.keys(json.sources_of_income)
    expect(category_names.length).toBeGreaterThan(0)
    for (const key of category_names) {
      expect(Array.isArray(json.sources_of_income[key])).toBe(true)
    }
    // Each entry has the expected shape
    const all_sources = Object.values(
      json.sources_of_income as Record<string, { id: string; name: string; income: number }[]>
    ).flat()
    const first_source = all_sources[0]
    expect(typeof first_source.id).toBe('string')
    expect(typeof first_source.name).toBe('string')
    expect(typeof first_source.income).toBe('number')
    // The source we created appears under its category
    expect(all_sources.some((s) => s.name === `test-soi-${TS}-list`)).toBe(true)
  })

  it('PATCH /api/v1/sources_of_income/:id updates a source of income', async () => {
    const created = await (
      await req('POST', '/api/v1/sources_of_income', {
        name: `test-soi-${TS}-patch-old`,
        category_id: Number(test_category_id),
      })
    ).json()
    const res = await req('PATCH', `/api/v1/sources_of_income/${created.id}`, {
      name: `test-soi-${TS}-patch-new`,
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe(`test-soi-${TS}-patch-new`)
  })

  it('PATCH /api/v1/sources_of_income/:id returns 404 for unknown id', async () => {
    const res = await req('PATCH', '/api/v1/sources_of_income/999999999', {
      name: `test-soi-${TS}-x`,
    })
    expect(res.status).toBe(404)
  })

  it('PATCH /api/v1/sources_of_income/:id returns 404 for category not owned by user', async () => {
    const created = await (
      await req('POST', '/api/v1/sources_of_income', {
        name: `test-soi-${TS}-cat-check`,
        category_id: Number(test_category_id),
      })
    ).json()
    const res = await req('PATCH', `/api/v1/sources_of_income/${created.id}`, {
      category_id: 999999999,
    })
    expect(res.status).toBe(404)
  })

  it('DELETE /api/v1/sources_of_income/:id deletes a source of income', async () => {
    const created = await (
      await req('POST', '/api/v1/sources_of_income', {
        name: `test-soi-${TS}-del`,
        category_id: Number(test_category_id),
      })
    ).json()
    const res = await req('DELETE', `/api/v1/sources_of_income/${created.id}`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toBeDefined()
  })

  it('DELETE /api/v1/sources_of_income/:id returns 404 for unknown id', async () => {
    const res = await req('DELETE', '/api/v1/sources_of_income/999999999')
    expect(res.status).toBe(404)
  })

  it('POST /api/v1/sources_of_income returns 400 when user has 100 sources', async () => {
    const user = await db.user.findUnique({ where: { external_id: TEST_EXTERNAL_ID } })
    const cat = await db.sourceOfIncomeCategory.findFirst({ where: { user_id: user!.id } })
    await db.sourceOfIncome.createMany({
      data: Array.from({ length: 100 }, (_, i) => ({
        name: `limit-soi-${TS}-${i}`,
        category_id: cat!.id,
        user_id: user!.id,
      })),
    })
    const res = await req('POST', '/api/v1/sources_of_income', {
      name: `test-soi-${TS}-over-limit`,
      category_id: Number(test_category_id),
    })
    expect(res.status).toBe(400)
    await db.sourceOfIncome.deleteMany({ where: { name: { startsWith: `limit-soi-${TS}` } } })
  })

  it('GET /api/v1/sources_of_income returns pagination metadata', async () => {
    const res = await req('GET', '/api/v1/sources_of_income')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.pagination).toBeDefined()
    expect(typeof json.pagination.page).toBe('number')
    expect(typeof json.pagination.limit).toBe('number')
    expect(typeof json.pagination.total).toBe('number')
  })

  it('GET /api/v1/sources_of_income with limit=5001 returns 400', async () => {
    const res = await req('GET', '/api/v1/sources_of_income?limit=5001')
    expect(res.status).toBe(400)
  })
})
