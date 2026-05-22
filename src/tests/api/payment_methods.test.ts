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

const TEST_EXTERNAL_ID = `user_pm_test_${Date.now()}`

const makeToken = (user_external_id: string) =>
  new SignJWT({ azp: process.env.CLERK_AUTHORIZED_PARTY })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(user_external_id)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(testPrivateKey)

const req = (method: string, path: string, token: string, body?: unknown) =>
  app.handle(
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

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID } })
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
        body: JSON.stringify({ name: 'Test' }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('POST /api/v1/payment_methods creates a payment method', async () => {
    const token = await makeToken(TEST_EXTERNAL_ID)
    const res = await req('POST', '/api/v1/payment_methods', token, {
      name: 'My Bank',
      bank: 'Nubank',
      receiver: 'Pedro',
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe('My Bank')
    expect(json.bank).toBe('Nubank')
    expect(json.receiver).toBe('Pedro')
  })

  it('GET /api/v1/payment_methods returns the list for the authenticated user', async () => {
    const token = await makeToken(TEST_EXTERNAL_ID)
    const res = await req('GET', '/api/v1/payment_methods', token)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.payment_methods)).toBe(true)
    expect(json.payment_methods.some((pm: { name: string }) => pm.name === 'My Bank')).toBe(true)
  })

  it('PATCH /api/v1/payment_methods/:id updates a payment method', async () => {
    const token = await makeToken(TEST_EXTERNAL_ID)
    const created = await (
      await req('POST', '/api/v1/payment_methods', token, { name: 'Old Name' })
    ).json()
    const res = await req('PATCH', `/api/v1/payment_methods/${created.id}`, token, {
      name: 'New Name',
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe('New Name')
  })

  it('PATCH /api/v1/payment_methods/:id returns 404 for nonexistent id', async () => {
    const token = await makeToken(TEST_EXTERNAL_ID)
    const res = await req('PATCH', '/api/v1/payment_methods/999999999', token, { name: 'X' })
    expect(res.status).toBe(404)
  })

  it('DELETE /api/v1/payment_methods/:id deletes a payment method', async () => {
    const token = await makeToken(TEST_EXTERNAL_ID)
    const created = await (
      await req('POST', '/api/v1/payment_methods', token, { name: 'To Delete' })
    ).json()
    const res = await req('DELETE', `/api/v1/payment_methods/${created.id}`, token)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toBeDefined()
  })

  it('DELETE /api/v1/payment_methods/:id returns 404 for nonexistent id', async () => {
    const token = await makeToken(TEST_EXTERNAL_ID)
    const res = await req('DELETE', '/api/v1/payment_methods/999999999', token)
    expect(res.status).toBe(404)
  })
})
