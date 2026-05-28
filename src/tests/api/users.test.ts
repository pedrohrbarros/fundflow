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

const TEST_EXTERNAL_ID = `user_users_api_${Date.now()}`

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
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Users API', () => {
  it('PATCH /api/v1/users/country updates the user country', async () => {
    const res = await req('PATCH', '/api/v1/users/country', { country: 'US' })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.country).toBe('US')
    expect(json.id).toBeDefined()
  })

  it('PATCH /api/v1/users/country returns 400 for invalid country code', async () => {
    const res = await req('PATCH', '/api/v1/users/country', { country: 'INVALID' })
    expect(res.status).toBe(400)
  })

  it('GET /api/v1/users/me returns the current user', async () => {
    const res = await req('GET', '/api/v1/users/me')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(typeof json.country).toBe('string')
  })
})
