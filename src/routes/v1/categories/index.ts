import { Elysia } from 'elysia'
import { createCategory } from './create'
import { searchCategories } from './search'
import { updateCategory } from './update'
import { deleteCategory } from './delete'
import { CategoryCreateBody, CategoryUpdateBody } from '../../../types/categories'
import { CategorySearchBody } from '../../../types/search'
import type { RouteHandler } from '../../../types/routes'

export const categories = new Elysia()
  .post('/categories', createCategory as RouteHandler, {
    detail: {
      tags: ['Categories'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: CategoryCreateBody as unknown as Record<string, unknown>,
          },
        },
      },
    },
  })
  .post('/categories/search', searchCategories as RouteHandler, {
    detail: {
      tags: ['Categories'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: CategorySearchBody as unknown as Record<string, unknown>,
          },
        },
      },
    },
  })
  .patch('/categories/:id', updateCategory as RouteHandler, {
    detail: {
      tags: ['Categories'],
      security: [{ apiKey: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: CategoryUpdateBody as unknown as Record<string, unknown>,
          },
        },
      },
    },
  })
  .delete('/categories/:id', deleteCategory as RouteHandler, {
    detail: { tags: ['Categories'], security: [{ apiKey: [] }] },
  })
