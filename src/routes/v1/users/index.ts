import { Elysia } from 'elysia'
import { getMe } from './get_me'
import { updateCountry } from './update_country'
import { UpdateCountryBody } from '../../../types/users'
import { UserResponse } from '../../../types/responses'
import type { RouteHandler } from '../../../types/routes'

const s = (schema: object) => ({
  'application/json': { schema: schema as Record<string, unknown> },
})

export const users = new Elysia()
  .get('/users/me', getMe as RouteHandler, {
    detail: {
      hide: true,
      tags: ['Users'],
      security: [{ apiKey: [] }],
      responses: {
        '200': { description: 'OK', content: s(UserResponse) },
      },
    },
  })
  .patch('/users/country', updateCountry as RouteHandler, {
    detail: {
      hide: true,
      tags: ['Users'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: true,
        content: s(UpdateCountryBody),
      },
      responses: {
        '200': { description: 'OK', content: s(UserResponse) },
      },
    },
  })
