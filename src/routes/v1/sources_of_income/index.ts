import { Elysia } from 'elysia'
import { createSourceOfIncome } from './create'
import { searchSourcesOfIncome } from './search'
import { updateSourceOfIncome } from './update'
import { deleteSourceOfIncome } from './delete'
import {
  SourceOfIncomeCreateBody,
  SourceOfIncomeUpdateBody,
} from '../../../types/sources_of_income'
import { SourceOfIncomeSearchBody } from '../../../types/search'
import {
  SourceOfIncomeResponse,
  SourceOfIncomeSearchResponse,
  DeletedResponse,
} from '../../../types/responses'
import type { RouteHandler } from '../../../types/routes'

const s = (schema: object) => ({
  'application/json': { schema: schema as Record<string, unknown> },
})

export const sources_of_income = new Elysia()
  .post('/sources_of_income', createSourceOfIncome as RouteHandler, {
    detail: {
      tags: ['Sources of Income'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: true,
        content: s(SourceOfIncomeCreateBody),
      },
      responses: {
        '201': { description: 'Created', content: s(SourceOfIncomeResponse) },
      },
    },
  })
  .post('/sources_of_income/search', searchSourcesOfIncome as RouteHandler, {
    detail: {
      tags: ['Sources of Income'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: false,
        content: s(SourceOfIncomeSearchBody),
      },
      responses: {
        '200': { description: 'OK', content: s(SourceOfIncomeSearchResponse) },
      },
    },
  })
  .patch('/sources_of_income/:id', updateSourceOfIncome as RouteHandler, {
    detail: {
      tags: ['Sources of Income'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: true,
        content: s(SourceOfIncomeUpdateBody),
      },
      responses: {
        '200': { description: 'OK', content: s(SourceOfIncomeResponse) },
      },
    },
  })
  .delete('/sources_of_income/:id', deleteSourceOfIncome as RouteHandler, {
    detail: {
      tags: ['Sources of Income'],
      security: [{ apiKey: [] }],
      responses: {
        '200': { description: 'OK', content: s(DeletedResponse) },
      },
    },
  })
