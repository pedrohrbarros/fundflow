import { Elysia } from 'elysia'
import { createCategory } from './create'
import { searchCategories } from './search'
import { updateCategory } from './update'
import { deleteCategory } from './delete'
import { CategoryCreateBody, CategoryUpdateBody } from '../../../types/categories'
import { CategorySearchBody } from '../../../types/search'
import { CategoryResponse, CategorySearchResponse, DeletedResponse } from '../../../types/responses'
import type { RouteHandler } from '../../../types/routes'

const s = (schema: object) => ({
  'application/json': { schema: schema as Record<string, unknown> },
})

export const categories = new Elysia()
  .post('/categories', createCategory as RouteHandler, {
    detail: {
      tags: ['Categories'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: true,
        content: s(CategoryCreateBody),
      },
      responses: {
        '201': { description: 'Created', content: s(CategoryResponse) },
      },
    },
  })
  .post('/categories/search', searchCategories as RouteHandler, {
    detail: {
      tags: ['Categories'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: false,
        content: s(CategorySearchBody),
      },
      responses: {
        '200': { description: 'OK', content: s(CategorySearchResponse) },
      },
    },
  })
  .patch('/categories/:id', updateCategory as RouteHandler, {
    detail: {
      tags: ['Categories'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: true,
        content: s(CategoryUpdateBody),
      },
      responses: {
        '200': { description: 'OK', content: s(CategoryResponse) },
      },
    },
  })
  .delete('/categories/:id', deleteCategory as RouteHandler, {
    detail: {
      tags: ['Categories'],
      security: [{ apiKey: [] }],
      responses: {
        '200': { description: 'OK', content: s(DeletedResponse) },
      },
    },
  })
