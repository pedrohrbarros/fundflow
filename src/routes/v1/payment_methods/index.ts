import { Elysia } from 'elysia'
import { createPaymentMethod } from './create'
import { searchPaymentMethods } from './search'
import { updatePaymentMethod } from './update'
import { deletePaymentMethod } from './delete'
import { PaymentMethodCreateBody, PaymentMethodUpdateBody } from '../../../types/payment_methods'
import { PaymentMethodSearchBody } from '../../../types/search'
import {
  PaymentMethodResponse,
  PaymentMethodSearchResponse,
  DeletedResponse,
} from '../../../types/responses'
import type { RouteHandler } from '../../../types/routes'

const s = (schema: object) => ({
  'application/json': { schema: schema as Record<string, unknown> },
})

export const payment_methods = new Elysia()
  .post('/payment_methods', createPaymentMethod as RouteHandler, {
    detail: {
      tags: ['Payment Methods'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: true,
        content: s(PaymentMethodCreateBody),
      },
      responses: {
        '201': { description: 'Created', content: s(PaymentMethodResponse) },
      },
    },
  })
  .post('/payment_methods/search', searchPaymentMethods as RouteHandler, {
    detail: {
      tags: ['Payment Methods'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: false,
        content: s(PaymentMethodSearchBody),
      },
      responses: {
        '200': { description: 'OK', content: s(PaymentMethodSearchResponse) },
      },
    },
  })
  .patch('/payment_methods/:id', updatePaymentMethod as RouteHandler, {
    detail: {
      tags: ['Payment Methods'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: true,
        content: s(PaymentMethodUpdateBody),
      },
      responses: {
        '200': { description: 'OK', content: s(PaymentMethodResponse) },
      },
    },
  })
  .delete('/payment_methods/:id', deletePaymentMethod as RouteHandler, {
    detail: {
      tags: ['Payment Methods'],
      security: [{ apiKey: [] }],
      responses: {
        '200': { description: 'OK', content: s(DeletedResponse) },
      },
    },
  })
