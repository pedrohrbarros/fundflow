import { Elysia } from 'elysia'
import { createPaymentMethod } from './payment_methods/create'
import { listPaymentMethods } from './payment_methods/list'
import { updatePaymentMethod } from './payment_methods/update'
import { deletePaymentMethod } from './payment_methods/delete'
import { PaymentMethodCreateBody, PaymentMethodUpdateBody } from '../../types/payment_methods'

export const payment_methods = new Elysia()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .post('/payment_methods', createPaymentMethod as any, {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .get('/payment_methods', listPaymentMethods as any, {
    detail: {
      security: [{ bearerAuth: [] }],
    },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .patch('/payment_methods/:id', updatePaymentMethod as any, {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .delete('/payment_methods/:id', deletePaymentMethod as any, {
    detail: {
      security: [{ bearerAuth: [] }],
    },
  })
