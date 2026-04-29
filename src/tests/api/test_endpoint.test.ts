import { describe, it, expect, mock } from 'bun:test'
import { generateKeyPair, SignJWT } from 'jose'
import { TestEndpointService } from '../../services/test_endpoint'

// --- Unit test (no mocking needed) ---

describe('TestEndpointService', () => {
  it('logUserId returns ok result with the user_id', () => {
    const result = TestEndpointService.logUserId('user_abc_123')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.user_id).toBe('user_abc_123')
  })
})

// --- API integration tests ---
// Generate a real RSA key pair for signing test tokens.
// Top-level await is supported in Bun (module: ES2022).
const { privateKey: testPrivateKey, publicKey: testPublicKey } = await generateKeyPair('RS256')

// Mock the Clerk config before importing the app so withClerkAuth
// verifies against our test public key instead of requiring a real PEM env var.
mock.module('../../config/clerk', () => ({
  getClerkPublicKey: async () => testPublicKey,
}))

process.env.CLERK_AUTHORIZED_PARTY = 'http://localhost:3000'

const { app } = await import('../../index')

const makeValidToken = (user_id: string) =>
  new SignJWT({ azp: process.env.CLERK_AUTHORIZED_PARTY })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(user_id)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(testPrivateKey)

const req = (path: string, token?: string) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  )

describe('Test Endpoint API', () => {
  it('GET /v1/test_endpoint returns 401 without Authorization header', async () => {
    const res = await req('/v1/test_endpoint')
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('GET /v1/test_endpoint returns 401 with a malformed token', async () => {
    const res = await req('/v1/test_endpoint', 'not.a.valid.jwt')
    expect(res.status).toBe(401)
  })

  it('GET /v1/test_endpoint returns 401 when azp does not match CLERK_AUTHORIZED_PARTY', async () => {
    const token = await new SignJWT({ azp: 'https://evil.example.com' })
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('user_clerk_test_xyz')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(testPrivateKey)
    const res = await req('/v1/test_endpoint', token)
    expect(res.status).toBe(401)
  })

  it('GET /v1/test_endpoint returns 200 with user_id for a valid JWT', async () => {
    const token = await makeValidToken('user_clerk_test_xyz')
    const res = await req('/v1/test_endpoint', token)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.user_id).toBe('user_clerk_test_xyz')
  })
})
