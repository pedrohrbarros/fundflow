import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test'

process.env.JWT_SECRET = 'test-secret-value'
process.env.GOOGLE_CLIENT_ID = 'test-client-id'

const SUB = `auth_svc_${Date.now()}`
let currentIdentity: { sub: string; email: string } | null = { sub: SUB, email: 'svc@gmail.com' }

mock.module('../../config/google', () => ({
  verifyGoogleIdToken: async () => currentIdentity,
}))

const { AuthService } = await import('../../services/auth')
const { db } = await import('../../config/db')
const { verifyAccessToken, hashRefreshToken } = await import('../../helpers/auth/tokens')

beforeEach(() => {
  currentIdentity = { sub: SUB, email: 'svc@gmail.com' }
})

afterAll(async () => {
  await db.user.deleteMany({ where: { external_id: SUB } })
  await db.$disconnect()
})

describe('AuthService', () => {
  it('loginWithGoogle upserts the user and issues tokens', async () => {
    const res = await AuthService.loginWithGoogle('any-id-token')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.data.user.email).toBe('svc@gmail.com')
    expect(await verifyAccessToken(res.data.access_token)).toEqual({
      external_id: SUB,
      email: 'svc@gmail.com',
    })
    const stored = await db.refreshToken.findUnique({
      where: { token_hash: hashRefreshToken(res.data.refresh_token) },
    })
    expect(stored?.revoked).toBe(false)
  })

  it('loginWithGoogle returns 401 when the Google token is invalid', async () => {
    currentIdentity = null
    const res = await AuthService.loginWithGoogle('bad')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(401)
  })

  it('refresh rotates the refresh token and revokes the old one', async () => {
    const login = await AuthService.loginWithGoogle('any-id-token')
    if (!login.ok) throw new Error('login failed')
    const old = login.data.refresh_token
    const res = await AuthService.refresh(old)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.data.refresh_token).not.toBe(old)
    const oldRow = await db.refreshToken.findUnique({
      where: { token_hash: hashRefreshToken(old) },
    })
    expect(oldRow?.revoked).toBe(true)
    expect((await AuthService.refresh(old)).ok).toBe(false)
  })

  it('logout revokes the refresh token', async () => {
    const login = await AuthService.loginWithGoogle('any-id-token')
    if (!login.ok) throw new Error('login failed')
    await AuthService.logout(login.data.refresh_token)
    expect((await AuthService.refresh(login.data.refresh_token)).ok).toBe(false)
  })
})
