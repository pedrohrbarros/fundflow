import { Elysia } from 'elysia'
import { createSourceOfIncome } from './sources_of_income/create'
import { listSourcesOfIncome } from './sources_of_income/list'
import { updateSourceOfIncome } from './sources_of_income/update'
import { deleteSourceOfIncome } from './sources_of_income/delete'
import { SourceOfIncomeCreateBody, SourceOfIncomeUpdateBody } from '../../types/sources_of_income'
import type { RouteHandler } from '../../types/routes'

export const sources_of_income = new Elysia()
  .post('/sources_of_income', createSourceOfIncome as RouteHandler, {
    detail: {
      security: [{ clerkAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: SourceOfIncomeCreateBody as unknown as Record<string, unknown>,
          },
        },
      },
    },
  })
  .get('/sources_of_income', listSourcesOfIncome as RouteHandler, {
    detail: { security: [{ clerkAuth: [] }] },
  })
  .patch('/sources_of_income/:id', updateSourceOfIncome as RouteHandler, {
    detail: {
      security: [{ clerkAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: SourceOfIncomeUpdateBody as unknown as Record<string, unknown>,
          },
        },
      },
    },
  })
  .delete('/sources_of_income/:id', deleteSourceOfIncome as RouteHandler, {
    detail: { security: [{ clerkAuth: [] }] },
  })
