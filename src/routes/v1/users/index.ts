import { Elysia } from 'elysia'
import { getMe } from './get_me'
import { updateCountry } from './update_country'
import type { RouteHandler } from '../../../types/routes'

export const users = new Elysia()
  .get('/users/me', getMe as RouteHandler, {
    detail: { security: [{ clerkAuth: [] }] },
  })
  .patch('/users/country', updateCountry as RouteHandler, {
    detail: { security: [{ clerkAuth: [] }] },
  })
