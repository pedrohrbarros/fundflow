import { Elysia } from 'elysia'
import { createPaymentMethod } from './payment_methods/create'
import { listPaymentMethods } from './payment_methods/list'
import { updatePaymentMethod } from './payment_methods/update'
import { deletePaymentMethod } from './payment_methods/delete'
import { PaymentMethodCreateBody, PaymentMethodUpdateBody } from '../../types/payment_methods'
import type { RouteHandler } from '../../types/routes'

export const payment_methods = new Elysia()
  .post('/payment_methods', createPaymentMethod as RouteHandler, {
    detail: {
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: PaymentMethodCreateBody as unknown as Record<string, unknown>,
          },
        },
      },
    },
  })
  .get('/payment_methods', listPaymentMethods as RouteHandler, {
    detail: { security: [{ bearerAuth: [] }] },
  })
  .patch('/payment_methods/:id', updatePaymentMethod as RouteHandler, {
    detail: {
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: PaymentMethodUpdateBody as unknown as Record<string, unknown>,
          },
        },
      },
    },
  })
  .delete('/payment_methods/:id', deletePaymentMethod as RouteHandler, {
    detail: { security: [{ bearerAuth: [] }] },
  })
