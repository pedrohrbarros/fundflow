import { Elysia } from 'elysia'
import { createExpense } from './create'
import { listExpenses } from './list'
import { updateExpense } from './update'
import { deleteExpense } from './delete'
import { ExpenseCreateBody, ExpenseUpdateBody } from '../../../types/expenses'
import type { RouteHandler } from '../../../types/routes'

export const expenses = new Elysia()
  .post('/expenses', createExpense as RouteHandler, {
    detail: {
      security: [{ clerkAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ExpenseCreateBody as unknown as Record<string, unknown>,
          },
        },
      },
    },
  })
  .get('/expenses', listExpenses as RouteHandler, {
    detail: { security: [{ clerkAuth: [] }] },
  })
  .patch('/expenses/:id', updateExpense as RouteHandler, {
    detail: {
      security: [{ clerkAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ExpenseUpdateBody as unknown as Record<string, unknown>,
          },
        },
      },
    },
  })
  .delete('/expenses/:id', deleteExpense as RouteHandler, {
    detail: { security: [{ clerkAuth: [] }] },
  })
