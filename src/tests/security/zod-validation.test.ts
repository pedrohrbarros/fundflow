import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test'
import { generateKeyPair, SignJWT } from 'jose'
import { db } from '../../config/db'

const { privateKey: test_private_key, publicKey: test_public_key } = await generateKeyPair('RS256')

mock.module('../../config/clerk', () => ({
  getClerkPublicKey: async () => test_public_key,
}))

process.env.CLERK_AUTHORIZED_PARTY = 'http://localhost:3000'
process.env.API_TOKEN = 'test-api-token'
process.env.ALLOWED_ORIGINS = '["http://localhost:3000"]'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_zod_${Date.now()}`

const make_token = () =>
  new SignJWT({ azp: process.env.CLERK_AUTHORIZED_PARTY })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(TEST_EXTERNAL_ID)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(test_private_key)

const req = async (method: string, path: string, body?: unknown) => {
  const token = await make_token()
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

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID } })
})

afterAll(async () => {
  await db.sourceOfIncomeCategory.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
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
      const res = await req('POST', '/api/v1/expenses', { name: 'test', amount: 0 })
      expect(res.status).toBe(400)
    })

    it('POST /api/v1/expenses returns 400 when name is missing', async () => {
      const res = await req('POST', '/api/v1/expenses', { amount: 10 })
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
      const res = await req('POST', '/api/v1/sources_of_income', { category_id: 1 })
      expect(res.status).toBe(400)
    })

    it('POST /api/v1/sources_of_income returns 400 when category_id is a float', async () => {
      const res = await req('POST', '/api/v1/sources_of_income', { name: 'test', category_id: 1.5 })
      expect(res.status).toBe(400)
    })
  })
})
