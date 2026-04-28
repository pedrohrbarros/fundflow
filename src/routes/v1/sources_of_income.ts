import { Elysia } from 'elysia'
import { createSourceOfIncome } from './sources_of_income/create'
import { listSourcesOfIncome } from './sources_of_income/list'
import { updateSourceOfIncome } from './sources_of_income/update'
import { deleteSourceOfIncome } from './sources_of_income/delete'
import { SourceOfIncomeCreateBody, SourceOfIncomeUpdateBody } from '../../types/sources_of_income'

export const sources_of_income = new Elysia()
  .post('/sources_of_income', createSourceOfIncome, {
    detail: {
      security: [{ bearerAuth: [] }],
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
  .get('/sources_of_income', listSourcesOfIncome, {
    detail: {
      security: [{ bearerAuth: [] }],
    },
  })
  .patch('/sources_of_income/:id', updateSourceOfIncome, {
    detail: {
      security: [{ bearerAuth: [] }],
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
  .delete('/sources_of_income/:id', deleteSourceOfIncome, {
    detail: {
      security: [{ bearerAuth: [] }],
    },
  })
