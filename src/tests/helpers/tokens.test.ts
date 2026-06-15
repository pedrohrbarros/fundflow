import { describe, it, expect, beforeEach } from 'bun:test'
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  ACCESS_TOKEN_TTL_SECONDS,
} from '../../helpers/auth/tokens'

describe('auth tokens', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-value'
  })

  it('signs and verifies an access token round-trip', async () => {
    const token = await signAccessToken({ external_id: 'google-sub-1', email: 'a@b.com' })
    const claims = await verifyAccessToken(token)
    expect(claims).toEqual({ external_id: 'google-sub-1', email: 'a@b.com' })
  })

  it('returns null for a tampered/invalid token', async () => {
    expect(await verifyAccessToken('not-a-jwt')).toBeNull()
  })

  it('hashes refresh tokens deterministically and uniquely', () => {
    const t = generateRefreshToken()
    expect(t).toHaveLength(64)
    expect(hashRefreshToken(t)).toBe(hashRefreshToken(t))
    expect(hashRefreshToken(t)).not.toBe(t)
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(900)
  })
})
