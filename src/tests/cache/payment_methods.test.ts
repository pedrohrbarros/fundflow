import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test'
import { generateKeyPair, SignJWT } from 'jose'
import { db } from '../../config/db'
import { client } from '../../config/redis'

const { privateKey: testPrivateKey, publicKey: testPublicKey } = await generateKeyPair('RS256')

mock.module('../../config/clerk', () => ({
  getClerkPublicKey: async () => testPublicKey,
}))

process.env.CLERK_AUTHORIZED_PARTY = 'http://localhost:3000'
process.env.API_TOKEN = 'test-api-token'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_cache_pm_test_${Date.now()}`
const CACHE_KEY = `payment_methods:list:${TEST_EXTERNAL_ID}`

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

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID } })
})

afterAll(async () => {
  await client.del(CACHE_KEY)
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Payment methods cache', () => {
  it('GET /api/v1/payment_methods populates the cache for the user', async () => {
    await req('GET', '/api/v1/payment_methods')
    const cached = await client.get(CACHE_KEY)
    expect(cached).not.toBeNull()
    expect(Array.isArray(JSON.parse(cached!))).toBe(true)
  })
})
