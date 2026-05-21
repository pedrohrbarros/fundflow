import { Elysia } from 'elysia'
import { createExpense } from './expenses/create'
import { listExpenses } from './expenses/list'
import { updateExpense } from './expenses/update'
import { deleteExpense } from './expenses/delete'
import { ExpenseCreateBody, ExpenseUpdateBody } from '../../types/expenses'

export const expenses = new Elysia()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .post('/expenses', createExpense as any, {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .get('/expenses', listExpenses as any, {
    detail: { security: [{ clerkAuth: [] }] },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .patch('/expenses/:id', updateExpense as any, {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .delete('/expenses/:id', deleteExpense as any, {
    detail: { security: [{ clerkAuth: [] }] },
  })
