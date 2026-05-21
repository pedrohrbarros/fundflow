import { Elysia } from 'elysia'
import { createCategory } from './categories/create'
import { listCategories } from './categories/list'
import { updateCategory } from './categories/update'
import { deleteCategory } from './categories/delete'
import { CategoryCreateBody, CategoryUpdateBody } from '../../types/categories'
import type { RouteHandler } from '../../types/routes'

export const categories = new Elysia()
  .post('/categories', createCategory as RouteHandler, {
    detail: {
      security: [{ clerkAuth: [] }],
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
  .get('/categories', listCategories as RouteHandler, {
    detail: { security: [{ clerkAuth: [] }] },
  })
  .patch('/categories/:id', updateCategory as RouteHandler, {
    detail: {
      security: [{ clerkAuth: [] }],
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
    detail: { security: [{ clerkAuth: [] }] },
  })
