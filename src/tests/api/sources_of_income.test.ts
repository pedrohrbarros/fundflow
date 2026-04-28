import { describe, it, expect, beforeAll, afterEach, afterAll } from 'bun:test'
import { app } from '../../index'
import { db } from '../../config/db'

const TS = Date.now()
const AUTH_TOKEN = 'test-token'
let test_category_id: number

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

beforeAll(async () => {
  process.env.API_TOKEN = AUTH_TOKEN
  const category = await db.sourceOfIncomeCategory.create({
    data: { name: `test-soi-cat-${TS}` },
  })
  test_category_id = Number(category.id)
})

afterEach(async () => {
  await db.sourceOfIncome.deleteMany({
    where: { name: { startsWith: `test-soi-${TS}` } },
  })
})

afterAll(async () => {
  await db.sourceOfIncomeCategory.deleteMany({
    where: { name: `test-soi-cat-${TS}` },
  })
  await db.$disconnect()
})

describe('Sources of Income API', () => {
  it('POST /v1/sources_of_income creates a source of income', async () => {
    const res = await req('POST', '/v1/sources_of_income', {
      name: `test-soi-${TS}-create`,
      category_id: test_category_id,
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe(`test-soi-${TS}-create`)
    expect(json.category_id).toBe(String(test_category_id))
  })

  it('GET /v1/sources_of_income returns a list', async () => {
    await req('POST', '/v1/sources_of_income', {
      name: `test-soi-${TS}-list`,
      category_id: test_category_id,
    })
    const res = await req('GET', '/v1/sources_of_income')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.sources_of_income)).toBe(true)
    expect(
      json.sources_of_income.some(
        (source_of_income: { name: string }) => source_of_income.name === `test-soi-${TS}-list`
      )
    ).toBe(true)
  })

  it('PATCH /v1/sources_of_income/:id updates a source of income', async () => {
    const created = await (
      await req('POST', '/v1/sources_of_income', {
        name: `test-soi-${TS}-patch-old`,
        category_id: test_category_id,
      })
    ).json()
    const res = await req('PATCH', `/v1/sources_of_income/${created.id}`, {
      name: `test-soi-${TS}-patch-new`,
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe(`test-soi-${TS}-patch-new`)
  })

  it('PATCH /v1/sources_of_income/:id returns 404 for unknown id', async () => {
    const res = await req('PATCH', '/v1/sources_of_income/999999999', {
      name: `test-soi-${TS}-x`,
    })
    expect(res.status).toBe(404)
  })

  it('DELETE /v1/sources_of_income/:id deletes a source of income', async () => {
    const created = await (
      await req('POST', '/v1/sources_of_income', {
        name: `test-soi-${TS}-del`,
        category_id: test_category_id,
      })
    ).json()
    const res = await req('DELETE', `/v1/sources_of_income/${created.id}`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toBeDefined()
  })

  it('DELETE /v1/sources_of_income/:id returns 404 for unknown id', async () => {
    const res = await req('DELETE', '/v1/sources_of_income/999999999')
    expect(res.status).toBe(404)
  })
})
