import { Elysia } from 'elysia'
import { createExpense } from './create'
import { searchExpenses } from './search'
import { updateExpense } from './update'
import { deleteExpense } from './delete'
import { ExpenseCreateBody, ExpenseUpdateBody } from '../../../types/expenses'
import { ExpenseSearchBody } from '../../../types/search'
import { ExpenseResponse, ExpenseSearchResponse, DeletedResponse } from '../../../types/responses'
import type { RouteHandler } from '../../../types/routes'

const s = (schema: object) => ({
  'application/json': { schema: schema as Record<string, unknown> },
})

export const expenses = new Elysia()
  .post('/expenses', createExpense as RouteHandler, {
    detail: {
      tags: ['Expenses'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: true,
        content: s(ExpenseCreateBody),
      },
      responses: {
        '201': { description: 'Created', content: s(ExpenseResponse) },
      },
    },
  })
  .post('/expenses/search', searchExpenses as RouteHandler, {
    detail: {
      tags: ['Expenses'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: false,
        content: s(ExpenseSearchBody),
      },
      responses: {
        '200': { description: 'OK', content: s(ExpenseSearchResponse) },
      },
    },
  })
  .patch('/expenses/:id', updateExpense as RouteHandler, {
    detail: {
      tags: ['Expenses'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: true,
        content: s(ExpenseUpdateBody),
      },
      responses: {
        '200': { description: 'OK', content: s(ExpenseResponse) },
      },
    },
  })
  .delete('/expenses/:id', deleteExpense as RouteHandler, {
    detail: {
      tags: ['Expenses'],
      security: [{ apiKey: [] }],
      responses: {
        '200': { description: 'OK', content: s(DeletedResponse) },
      },
    },
  })
