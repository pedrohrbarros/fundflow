import { Elysia } from 'elysia'
import { getMe } from './get_me'
import { updateCountry } from './update_country'
import { UpdateCountryBody } from '../../../types/users'
import type { RouteHandler } from '../../../types/routes'

export const users = new Elysia()
  .get('/users/me', getMe as RouteHandler, {
    detail: { security: [{ clerkAuth: [] }] },
  })
  .patch('/users/country', updateCountry as RouteHandler, {
    detail: {
      security: [{ clerkAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: UpdateCountryBody as unknown as Record<string, unknown>,
          },
        },
      },
    },
  })
