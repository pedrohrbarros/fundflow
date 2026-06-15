import { db } from '../config/db'
import { verifyGoogleIdToken } from '../config/google'
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../helpers/auth/tokens'
import type { ServiceResult } from './types'

export type AuthTokens = {
  access_token: string
  refresh_token: string
  token_type: 'Bearer'
  access_expires_in: number
}

export type LoginResult = AuthTokens & {
  user: { id: number; email: string; country: string }
}

async function issueTokens(user: {
  id: bigint
  external_id: string
  email: string
}): Promise<AuthTokens> {
  const access_token = await signAccessToken({ external_id: user.external_id, email: user.email })
  const refresh_token = generateRefreshToken()
  const expires_at = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
  await db.refreshToken.create({
    data: { token_hash: hashRefreshToken(refresh_token), user_id: user.id, expires_at },
  })
  return {
    access_token,
    refresh_token,
    token_type: 'Bearer',
    access_expires_in: ACCESS_TOKEN_TTL_SECONDS,
  }
}

export const AuthService = {
  async loginWithGoogle(id_token: string): Promise<ServiceResult<LoginResult>> {
    const identity = await verifyGoogleIdToken(id_token)
    if (!identity) return { ok: false, status: 401, message: 'Invalid Google token' }
    try {
      const user = await db.user.upsert({
        where: { external_id: identity.sub },
        update: { email: identity.email },
        create: { external_id: identity.sub, email: identity.email },
      })
      const tokens = await issueTokens(user)
      return {
        ok: true,
        data: {
          ...tokens,
          user: { id: Number(user.id), email: user.email, country: user.country },
        },
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to login',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async refresh(refresh_token: string): Promise<ServiceResult<AuthTokens>> {
    try {
      const existing = await db.refreshToken.findUnique({
        where: { token_hash: hashRefreshToken(refresh_token) },
        include: { user: true },
      })
      if (!existing || existing.revoked || existing.expires_at < new Date()) {
        return { ok: false, status: 401, message: 'Invalid or expired refresh token' }
      }
      await db.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } })
      const tokens = await issueTokens(existing.user)
      return { ok: true, data: tokens }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to refresh token',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async logout(refresh_token: string): Promise<ServiceResult<null>> {
    try {
      await db.refreshToken.updateMany({
        where: { token_hash: hashRefreshToken(refresh_token) },
        data: { revoked: true },
      })
      return { ok: true, data: null }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to logout',
        meta: { error: (err as Error)?.message },
      }
    }
  },
}
