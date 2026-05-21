import { Elysia } from 'elysia'
import { createSourceOfIncome } from './sources_of_income/create'
import { listSourcesOfIncome } from './sources_of_income/list'
import { updateSourceOfIncome } from './sources_of_income/update'
import { deleteSourceOfIncome } from './sources_of_income/delete'
import { SourceOfIncomeCreateBody, SourceOfIncomeUpdateBody } from '../../types/sources_of_income'

export const sources_of_income = new Elysia()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .post('/sources_of_income', createSourceOfIncome as any, {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .get('/sources_of_income', listSourcesOfIncome as any, {
    detail: { security: [{ clerkAuth: [] }] },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .patch('/sources_of_income/:id', updateSourceOfIncome as any, {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .delete('/sources_of_income/:id', deleteSourceOfIncome as any, {
    detail: { security: [{ clerkAuth: [] }] },
  })
