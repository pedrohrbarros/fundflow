import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../config/db'
import { signAccessToken } from '../../helpers/auth/tokens'

process.env.JWT_SECRET = 'test-secret-value'
process.env.API_TOKEN = 'test-api-token'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_pm_test_${Date.now()}`
const TEST_EMAIL = `${TEST_EXTERNAL_ID}@test.local`

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
  await db.paymentMethod.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Payment Methods API', () => {
  it('POST /api/v1/payment_methods returns 401 without Authorization header', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/payment_methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', origin: 'Test Bank' }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('POST /api/v1/payment_methods returns 400 when origin is missing', async () => {
    const res = await req('POST', '/api/v1/payment_methods', { name: 'No Origin' })
    expect(res.status).toBe(400)
  })

  it('POST /api/v1/payment_methods creates a payment method', async () => {
    const res = await req('POST', '/api/v1/payment_methods', {
      name: 'My Card',
      origin: 'Inter Bank',
      receiver: 'Pedro',
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe('My Card')
    expect(json.origin).toBe('Inter Bank')
    expect(json.receiver).toBe('Pedro')
  })

  it('POST /api/v1/payment_methods/search returns the list for the authenticated user', async () => {
    const res = await req('POST', '/api/v1/payment_methods/search', {})
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.payment_methods)).toBe(true)
    expect(json.payment_methods.some((pm: { name: string }) => pm.name === 'My Card')).toBe(true)
    expect(
      json.payment_methods.every((pm: { origin: string }) => typeof pm.origin === 'string')
    ).toBe(true)
  })

  it('POST /api/v1/payment_methods/search returns pagination metadata', async () => {
    const res = await req('POST', '/api/v1/payment_methods/search', {})
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.pagination).toBeDefined()
    expect(typeof json.pagination.page).toBe('number')
    expect(typeof json.pagination.limit).toBe('number')
    expect(typeof json.pagination.total).toBe('number')
  })

  it('POST /api/v1/payment_methods/search with limit=5001 returns 400', async () => {
    const res = await req('POST', '/api/v1/payment_methods/search', { limit: 5001 })
    expect(res.status).toBe(400)
  })

  it('POST /api/v1/payment_methods/search with is_equal filter on name returns only matching methods', async () => {
    const res = await req('POST', '/api/v1/payment_methods/search', {
      filters: { field: 'name', op: 'is_equal', value: 'My Card' },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.payment_methods.every((pm: { name: string }) => pm.name === 'My Card')).toBe(true)
    expect(json.payment_methods.length).toBeGreaterThan(0)
  })

  it('POST /api/v1/payment_methods/search with unknown field returns 400', async () => {
    const res = await req('POST', '/api/v1/payment_methods/search', {
      filters: { field: 'nonexistent', op: 'is_equal', value: 'x' },
    })
    expect(res.status).toBe(400)
  })

  it('PATCH /api/v1/payment_methods/:id updates a payment method', async () => {
    const created = await (
      await req('POST', '/api/v1/payment_methods', {
        name: 'Old Name',
        origin: 'Old Bank',
      })
    ).json()
    const res = await req('PATCH', `/api/v1/payment_methods/${created.id}`, {
      name: 'New Name',
      origin: 'New Bank',
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe('New Name')
    expect(json.origin).toBe('New Bank')
  })

  it('PATCH /api/v1/payment_methods/:id returns 404 for nonexistent id', async () => {
    const res = await req('PATCH', '/api/v1/payment_methods/999999999', { name: 'X' })
    expect(res.status).toBe(404)
  })

  it('DELETE /api/v1/payment_methods/:id deletes a payment method', async () => {
    const created = await (
      await req('POST', '/api/v1/payment_methods', {
        name: 'To Delete',
        origin: 'Test Bank',
      })
    ).json()
    const res = await req('DELETE', `/api/v1/payment_methods/${created.id}`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toBeDefined()
  })

  it('DELETE /api/v1/payment_methods/:id returns 404 for nonexistent id', async () => {
    const res = await req('DELETE', '/api/v1/payment_methods/999999999')
    expect(res.status).toBe(404)
  })
})
