import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../config/db'
import { signAccessToken } from '../../helpers/auth/tokens'

process.env.JWT_SECRET = 'test-secret-value'
process.env.API_TOKEN = 'test-api-token'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_cat_api_${Date.now()}`
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

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID, email: TEST_EMAIL } })
})

afterAll(async () => {
  await db.category.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Categories API', () => {
  it('POST /api/v1/categories creates a category', async () => {
    const res = await req('POST', '/api/v1/categories', {
      name: `test-cat-${TS}-create`,
      type: 'INCOME',
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe(`test-cat-${TS}-create`)
    expect(json.type).toBe('INCOME')
    expect(json.created_at).toBeDefined()
    expect(json.updated_at).toBeDefined()
  })

  it('POST /api/v1/categories rejects a missing type', async () => {
    const res = await req('POST', '/api/v1/categories', { name: `test-cat-${TS}-no-type` })
    expect(res.status).toBe(400)
  })

  it("POST /api/v1/categories/search returns only the user's categories", async () => {
    await req('POST', '/api/v1/categories', { name: `test-cat-${TS}-list`, type: 'INCOME' })
    const res = await req('POST', '/api/v1/categories/search', {})
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.categories)).toBe(true)
    expect(json.categories.some((c: { name: string }) => c.name === `test-cat-${TS}-list`)).toBe(
      true
    )
  })

  it('POST /api/v1/categories/search returns pagination metadata', async () => {
    const res = await req('POST', '/api/v1/categories/search', {})
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.pagination).toBeDefined()
    expect(typeof json.pagination.page).toBe('number')
    expect(typeof json.pagination.limit).toBe('number')
    expect(typeof json.pagination.total).toBe('number')
  })

  it('POST /api/v1/categories/search with limit=5001 returns 400', async () => {
    const res = await req('POST', '/api/v1/categories/search', { limit: 5001 })
    expect(res.status).toBe(400)
  })

  it('POST /api/v1/categories/search with is_equal filter returns only matching categories', async () => {
    const name = `test-cat-${TS}-filter-eq`
    await req('POST', '/api/v1/categories', { name, type: 'INCOME' })
    await req('POST', '/api/v1/categories', { name: `test-cat-${TS}-filter-other`, type: 'INCOME' })
    const res = await req('POST', '/api/v1/categories/search', {
      filters: { field: 'name', op: 'is_equal', value: name },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.categories.every((c: { name: string }) => c.name === name)).toBe(true)
    expect(json.categories.length).toBeGreaterThan(0)
  })

  it('POST /api/v1/categories/search with unknown field returns 400', async () => {
    const res = await req('POST', '/api/v1/categories/search', {
      filters: { field: 'nonexistent', op: 'is_equal', value: 'x' },
    })
    expect(res.status).toBe(400)
  })

  it('PATCH /api/v1/categories/:id updates a category', async () => {
    const created = await (
      await req('POST', '/api/v1/categories', { name: `test-cat-${TS}-patch-old`, type: 'INCOME' })
    ).json()
    const res = await req('PATCH', `/api/v1/categories/${created.id}`, {
      name: `test-cat-${TS}-patch-new`,
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe(`test-cat-${TS}-patch-new`)
  })

  it('PATCH /api/v1/categories/:id returns 404 for unknown id', async () => {
    const res = await req('PATCH', '/api/v1/categories/999999999', { name: `test-cat-${TS}-x` })
    expect(res.status).toBe(404)
  })

  it('DELETE /api/v1/categories/:id deletes a category', async () => {
    const created = await (
      await req('POST', '/api/v1/categories', { name: `test-cat-${TS}-del`, type: 'INCOME' })
    ).json()
    const res = await req('DELETE', `/api/v1/categories/${created.id}`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toBeDefined()
  })

  it('DELETE /api/v1/categories/:id returns 404 for unknown id', async () => {
    const res = await req('DELETE', '/api/v1/categories/999999999')
    expect(res.status).toBe(404)
  })

  it('caps categories at 100 per type, INCOME full still allows EXPENSE', async () => {
    const user = await db.user.findUnique({ where: { external_id: TEST_EXTERNAL_ID } })
    await db.category.createMany({
      data: Array.from({ length: 100 }, (_, i) => ({
        name: `limit-cat-${TS}-${i}`,
        type: 'INCOME' as const,
        user_id: user!.id,
      })),
    })
    const overIncome = await req('POST', '/api/v1/categories', {
      name: `test-cat-${TS}-over-limit`,
      type: 'INCOME',
    })
    expect(overIncome.status).toBe(400)

    const expense = await req('POST', '/api/v1/categories', {
      name: `test-cat-${TS}-expense-ok`,
      type: 'EXPENSE',
    })
    expect(expense.status).toBe(201)

    await db.category.deleteMany({
      where: { name: { startsWith: `limit-cat-${TS}` } },
    })
  })

  it('POST /api/v1/categories/search filters by type', async () => {
    await req('POST', '/api/v1/categories', { name: `inc-${TS}`, type: 'INCOME' })
    await req('POST', '/api/v1/categories', { name: `exp-${TS}`, type: 'EXPENSE' })
    const res = await req('POST', '/api/v1/categories/search', {
      filters: { field: 'type', op: 'is_equal', value: 'EXPENSE' },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.categories.length).toBeGreaterThan(0)
    expect(json.categories.every((c: { type: string }) => c.type === 'EXPENSE')).toBe(true)
  })

  it('search sorts by name desc', async () => {
    await req('POST', '/api/v1/categories', { name: `sortA-${TS}`, type: 'EXPENSE' })
    await req('POST', '/api/v1/categories', { name: `sortZ-${TS}`, type: 'EXPENSE' })
    const res = await req('POST', '/api/v1/categories/search', {
      sort: { field: 'name', direction: 'desc' },
      filters: { field: 'name', fieldType: 'string', op: 'is_contains', value: 'sort' },
    })
    expect(res.status).toBe(200)
    const names = (await res.json()).categories.map((c: { name: string }) => c.name)
    const sorted = [...names].sort((a, b) => b.localeCompare(a))
    expect(names).toEqual(sorted)
  })

  it('search rejects an invalid sort field', async () => {
    const res = await req('POST', '/api/v1/categories/search', { sort: { field: 'evil' } })
    expect(res.status).toBe(400)
  })
})
