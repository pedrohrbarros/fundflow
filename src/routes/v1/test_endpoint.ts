import { Elysia } from 'elysia'
import { getTestEndpoint } from './test_endpoint/get'

export const test_endpoint = new Elysia().get('/test_endpoint', getTestEndpoint, {
  detail: {
    security: [{ bearerAuth: [] }],
  },
})
