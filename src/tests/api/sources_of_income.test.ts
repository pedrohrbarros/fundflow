import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../config/db'
import { signAccessToken } from '../../helpers/auth/tokens'

process.env.JWT_SECRET = 'test-secret-value'
process.env.API_TOKEN = 'test-api-token'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_soi_api_${Date.now()}`
const TEST_EMAIL = `${TEST_EXTERNAL_ID}@test.local`
const TS = Date.now()

const req = async (method: string, path: string, body?: unknown) => {
  const token = await signAccessToken({ external_id: TEST_EXTERNAL_ID, email: TEST_EMAIL })
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  )
}

let test_category_id: number

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID, email: TEST_EMAIL } })
  const catRes = await req('POST', '/api/v1/categories', {
    name: `test-soi-cat-${TS}`,
    type: 'INCOME',
  })
  const cat = await catRes.json()
  test_category_id = cat.id
})

afterAll(async () => {
  await db.sourceOfIncome.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.category.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Sources of Income API', () => {
  it('POST /api/v1/sources_of_income creates a source of income', async () => {
    const res = await req('POST', '/api/v1/sources_of_income', {
      name: `test-soi-${TS}-create`,
      category_id: Number(test_category_id),
      currency: 'EUR',
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe(`test-soi-${TS}-create`)
    expect(json.category_id).toBe(test_category_id)
    expect(json.currency).toBe('EUR')
  })

  it('rejects a source of income that references an EXPENSE category', async () => {
    const cat = await (
      await req('POST', '/api/v1/categories', { name: `soi-exp-${TS}`, type: 'EXPENSE' })
    ).json()
    const res = await req('POST', '/api/v1/sources_of_income', {
      name: `test-soi-${TS}-exp-cat`,
      category_id: Number(cat.id),
    })
    expect(res.status).toBe(404)
  })

  it('POST /api/v1/sources_of_income/search returns sources grouped by category with pagination', async () => {
    await req('POST', '/api/v1/sources_of_income', {
      name: `test-soi-${TS}-list`,
      category_id: Number(test_category_id),
    })
    const res = await req('POST', '/api/v1/sources_of_income/search', {})
    expect(res.status).toBe(200)
    const json = await res.json()
    expect('sources_of_income' in json).toBe(true)
    expect('pagination' in json).toBe(true)
    expect(typeof json.pagination.page).toBe('number')
    expect(typeof json.pagination.limit).toBe('number')
    expect(typeof json.pagination.total).toBe('number')
    const category_names = Object.keys(json.sources_of_income)
    expect(category_names.length).toBeGreaterThan(0)
    for (const key of category_names) {
      expect(Array.isArray(json.sources_of_income[key])).toBe(true)
    }
    const all_sources = Object.values(
      json.sources_of_income as Record<
        string,
        { id: number; name: string; income: number; currency: string }[]
      >
    ).flat()
    const first_source = all_sources[0]
    expect(typeof first_source.id).toBe('number')
    expect(typeof first_source.name).toBe('string')
    expect(typeof first_source.income).toBe('number')
    expect(typeof first_source.currency).toBe('string')
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
      currency: 'GBP',
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe(`test-soi-${TS}-patch-new`)
    expect(json.currency).toBe('GBP')
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
    const cat = await db.category.findFirst({ where: { user_id: user!.id } })
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

  it('POST /api/v1/sources_of_income/search returns pagination metadata', async () => {
    const res = await req('POST', '/api/v1/sources_of_income/search', {})
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.pagination).toBeDefined()
    expect(typeof json.pagination.page).toBe('number')
    expect(typeof json.pagination.limit).toBe('number')
    expect(typeof json.pagination.total).toBe('number')
  })

  it('POST /api/v1/sources_of_income/search with limit=5001 returns 400', async () => {
    const res = await req('POST', '/api/v1/sources_of_income/search', { limit: 5001 })
    expect(res.status).toBe(400)
  })

  it('POST /api/v1/sources_of_income/search with is_equal filter returns only matching sources', async () => {
    const name = `test-soi-${TS}-filter-eq`
    await req('POST', '/api/v1/sources_of_income', {
      name,
      category_id: Number(test_category_id),
    })
    await req('POST', '/api/v1/sources_of_income', {
      name: `test-soi-${TS}-filter-other`,
      category_id: Number(test_category_id),
    })
    const res = await req('POST', '/api/v1/sources_of_income/search', {
      filters: { field: 'name', op: 'is_equal', value: name },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    const all_sources = Object.values(
      json.sources_of_income as Record<string, { name: string }[]>
    ).flat()
    expect(all_sources.every((s) => s.name === name)).toBe(true)
    expect(all_sources.length).toBeGreaterThan(0)
  })

  it('POST /api/v1/sources_of_income/search with unknown field returns 400', async () => {
    const res = await req('POST', '/api/v1/sources_of_income/search', {
      filters: { field: 'nonexistent', op: 'is_equal', value: 'x' },
    })
    expect(res.status).toBe(400)
  })
})
