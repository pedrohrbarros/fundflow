import { Elysia } from 'elysia'
import { createExpense } from './create'
import { searchExpenses } from './search'
import { updateExpense } from './update'
import { deleteExpense } from './delete'
import { ExpenseCreateBody, ExpenseUpdateBody } from '../../../types/expenses'
import type { RouteHandler } from '../../../types/routes'

export const expenses = new Elysia()
  .post('/expenses', createExpense as RouteHandler, {
    detail: {
      tags: ['Expenses'],
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
  .post('/expenses/search', searchExpenses as RouteHandler, {
    detail: { tags: ['Expenses'], security: [{ clerkAuth: [] }] },
  })
  .patch('/expenses/:id', updateExpense as RouteHandler, {
    detail: {
      tags: ['Expenses'],
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
    detail: { tags: ['Expenses'], security: [{ clerkAuth: [] }] },
  })
