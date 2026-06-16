import { describe, it, expect, beforeEach } from 'bun:test'
import { verifyGoogleIdToken } from '../../config/google'
import { installGoogleTestJwks, signGoogleIdToken } from '../helpers/google_auth'

beforeEach(() => {
  installGoogleTestJwks()
})

describe('verifyGoogleIdToken', () => {
  it('returns sub + email for a valid, verified token', async () => {
    const token = await signGoogleIdToken({ sub: 'google-sub-123', email: 'user@gmail.com' })
    expect(await verifyGoogleIdToken(token)).toEqual({
      sub: 'google-sub-123',
      email: 'user@gmail.com',
    })
  })

  it('rejects a token with the wrong audience', async () => {
    const token = await signGoogleIdToken({
      sub: 'google-sub-123',
      email: 'user@gmail.com',
      audience: 'someone-else',
    })
    expect(await verifyGoogleIdToken(token)).toBeNull()
  })

  it('rejects an unverified email', async () => {
    const token = await signGoogleIdToken({
      sub: 'google-sub-123',
      email: 'user@gmail.com',
      email_verified: false,
    })
    expect(await verifyGoogleIdToken(token)).toBeNull()
  })
})
