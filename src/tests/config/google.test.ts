import { describe, it, expect, beforeEach } from 'bun:test'
import { generateKeyPair, SignJWT } from 'jose'
import { verifyGoogleIdToken, __setJwksForTest } from '../../config/google'

const { privateKey, publicKey } = await generateKeyPair('RS256')

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
  __setJwksForTest(async () => publicKey)
})

const sign = (claims: Record<string, unknown>) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer('https://accounts.google.com')
    .setAudience('test-client-id.apps.googleusercontent.com')
    .setSubject('google-sub-123')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)

describe('verifyGoogleIdToken', () => {
  it('returns sub + email for a valid, verified token', async () => {
    const token = await sign({ email: 'user@gmail.com', email_verified: true })
    expect(await verifyGoogleIdToken(token)).toEqual({
      sub: 'google-sub-123',
      email: 'user@gmail.com',
    })
  })

  it('rejects a token with the wrong audience', async () => {
    const token = await new SignJWT({ email: 'user@gmail.com', email_verified: true })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer('https://accounts.google.com')
      .setAudience('someone-else')
      .setSubject('google-sub-123')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey)
    expect(await verifyGoogleIdToken(token)).toBeNull()
  })

  it('rejects an unverified email', async () => {
    const token = await sign({ email: 'user@gmail.com', email_verified: false })
    expect(await verifyGoogleIdToken(token)).toBeNull()
  })
})
