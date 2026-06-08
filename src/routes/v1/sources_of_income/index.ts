import { Elysia } from 'elysia'
import { createSourceOfIncome } from './create'
import { searchSourcesOfIncome } from './search'
import { updateSourceOfIncome } from './update'
import { deleteSourceOfIncome } from './delete'
import {
  SourceOfIncomeCreateBody,
  SourceOfIncomeUpdateBody,
} from '../../../types/sources_of_income'
import type { RouteHandler } from '../../../types/routes'

export const sources_of_income = new Elysia()
  .post('/sources_of_income', createSourceOfIncome as RouteHandler, {
    detail: {
      tags: ['Sources of Income'],
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
  .post('/sources_of_income/search', searchSourcesOfIncome as RouteHandler, {
    detail: { tags: ['Sources of Income'], security: [{ clerkAuth: [] }] },
  })
  .patch('/sources_of_income/:id', updateSourceOfIncome as RouteHandler, {
    detail: {
      tags: ['Sources of Income'],
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
    detail: { tags: ['Sources of Income'], security: [{ clerkAuth: [] }] },
  })
