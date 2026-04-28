import { describe, it, expect, beforeAll, afterEach } from 'bun:test'
import { app } from '../../index'
import { db } from '../../config/db'

const TS = Date.now()
const AUTH_TOKEN = 'test-token'

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
  await db.sourceOfIncomeCategory.deleteMany({
    where: { name: { startsWith: `test-cat-${TS}` } },
  })
  await db.$disconnect()
})

describe('Categories API', () => {
  it('POST /v1/categories creates a category', async () => {
    const res = await req('POST', '/v1/categories', { name: `test-cat-${TS}-create` })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe(`test-cat-${TS}-create`)
  })

  it('GET /v1/categories returns a list', async () => {
    await req('POST', '/v1/categories', { name: `test-cat-${TS}-list` })
    const res = await req('GET', '/v1/categories')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.categories)).toBe(true)
    expect(json.categories.some((c: { name: string }) => c.name === `test-cat-${TS}-list`)).toBe(
      true
    )
  })

  it('PATCH /v1/categories/:id updates a category', async () => {
    const created = await (
      await req('POST', '/v1/categories', { name: `test-cat-${TS}-patch-old` })
    ).json()
    const res = await req('PATCH', `/v1/categories/${created.id}`, {
      name: `test-cat-${TS}-patch-new`,
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe(`test-cat-${TS}-patch-new`)
  })

  it('PATCH /v1/categories/:id returns 404 for unknown id', async () => {
    const res = await req('PATCH', '/v1/categories/999999999', { name: `test-cat-${TS}-x` })
    expect(res.status).toBe(404)
  })

  it('DELETE /v1/categories/:id deletes a category', async () => {
    const created = await (
      await req('POST', '/v1/categories', { name: `test-cat-${TS}-del` })
    ).json()
    const res = await req('DELETE', `/v1/categories/${created.id}`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toBeDefined()
  })

  it('DELETE /v1/categories/:id returns 404 for unknown id', async () => {
    const res = await req('DELETE', '/v1/categories/999999999')
    expect(res.status).toBe(404)
  })
})
