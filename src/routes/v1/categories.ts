import { Elysia } from 'elysia'
import { createCategory } from './categories/create'
import { listCategories } from './categories/list'
import { updateCategory } from './categories/update'
import { deleteCategory } from './categories/delete'
import { CategoryCreateBody, CategoryUpdateBody } from '../../types/categories'

export const categories = new Elysia()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .post('/categories', createCategory as any, {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .get('/categories', listCategories as any, {
    detail: { security: [{ clerkAuth: [] }] },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .patch('/categories/:id', updateCategory as any, {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .delete('/categories/:id', deleteCategory as any, {
    detail: { security: [{ clerkAuth: [] }] },
  })
