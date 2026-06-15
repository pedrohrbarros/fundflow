import { Elysia } from 'elysia'
import { googleLogin } from './google'
import { refreshTokens } from './refresh'
import { logout } from './logout'
import type { RouteHandler } from '../../../types/routes'

export const auth = new Elysia()
  .post('/auth/google', googleLogin as RouteHandler, {
    detail: { hide: true, tags: ['Auth'] },
  })
  .post('/auth/refresh', refreshTokens as RouteHandler, {
    detail: { hide: true, tags: ['Auth'] },
  })
  .post('/auth/logout', logout as RouteHandler, {
    detail: { hide: true, tags: ['Auth'] },
  })
