import { Elysia } from 'elysia'
import { getMe } from './get_me'
import { updateCountry } from './update_country'
import { UpdateCountryBody } from '../../../types/users'
import type { RouteHandler } from '../../../types/routes'

export const users = new Elysia()
  .get('/users/me', getMe as RouteHandler, {
    detail: { tags: ['Users'], security: [{ apiKey: [] }] },
  })
  .patch('/users/country', updateCountry as RouteHandler, {
    detail: {
      tags: ['Users'],
      security: [{ apiKey: [] }],
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
