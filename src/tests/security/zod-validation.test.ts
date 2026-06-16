import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../config/db'
import { signAccessToken } from '../../helpers/auth/tokens'

process.env.JWT_SECRET = 'test-secret-value'
process.env.API_TOKEN = 'test-api-token'
process.env.ALLOWED_ORIGINS = '["http://localhost:3000"]'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_zod_${Date.now()}`
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
  await db.category.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Zod Validation', () => {
  describe('categories', () => {
    it('POST /api/v1/categories returns 400 when name is empty string', async () => {
      const res = await req('POST', '/api/v1/categories', { name: '' })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.name).toBeDefined()
    })

    it('POST /api/v1/categories returns 400 when name field is missing', async () => {
      const res = await req('POST', '/api/v1/categories', {})
      expect(res.status).toBe(400)
    })

    it('PATCH /api/v1/categories/:id returns 400 when name is empty string', async () => {
      const res = await req('PATCH', '/api/v1/categories/1', { name: '' })
      expect(res.status).toBe(400)
    })
  })

  describe('expenses', () => {
    it('POST /api/v1/expenses returns 400 when amount is zero', async () => {
      const res = await req('POST', '/api/v1/expenses', {
        name: 'test',
        amount: 0,
        date: '2026-06-15',
      })
      expect(res.status).toBe(400)
    })

    it('POST /api/v1/expenses returns 400 when name is missing', async () => {
      const res = await req('POST', '/api/v1/expenses', { amount: 10, date: '2026-06-15' })
      expect(res.status).toBe(400)
    })

    it('POST /api/v1/expenses returns 400 when date is invalid', async () => {
      const res = await req('POST', '/api/v1/expenses', {
        name: 'test',
        category_id: 1,
        amount: 10,
        date: '2026-13-40',
      })
      expect(res.status).toBe(400)
    })

    it('POST /api/v1/expenses returns 400 when date is missing', async () => {
      const res = await req('POST', '/api/v1/expenses', {
        name: 'test',
        category_id: 1,
        amount: 10,
      })
      expect(res.status).toBe(400)
    })
  })

  describe('payment methods', () => {
    it('POST /api/v1/payment_methods returns 400 when name is missing', async () => {
      const res = await req('POST', '/api/v1/payment_methods', {})
      expect(res.status).toBe(400)
    })

    it('POST /api/v1/payment_methods returns 400 when name is empty string', async () => {
      const res = await req('POST', '/api/v1/payment_methods', { name: '' })
      expect(res.status).toBe(400)
    })
  })

  describe('sources of income', () => {
    it('POST /api/v1/sources_of_income returns 400 when name is missing', async () => {
      const res = await req('POST', '/api/v1/sources_of_income', {
        category_id: 1,
        date: '2026-06-15',
      })
      expect(res.status).toBe(400)
    })

    it('POST /api/v1/sources_of_income returns 400 when category_id is a float', async () => {
      const res = await req('POST', '/api/v1/sources_of_income', {
        name: 'test',
        category_id: 1.5,
        date: '2026-06-15',
      })
      expect(res.status).toBe(400)
    })
  })
})
