import { Elysia } from 'elysia'
import { createCategory } from './categories/create'
import { listCategories } from './categories/list'
import { updateCategory } from './categories/update'
import { deleteCategory } from './categories/delete'
import { CategoryCreateBody, CategoryUpdateBody } from '../../types/categories'

export const categories = new Elysia()
  .post('/categories', createCategory, {
    detail: {
      security: [{ bearerAuth: [] }],
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
  .get('/categories', listCategories, {
    detail: {
      security: [{ bearerAuth: [] }],
    },
  })
  .patch('/categories/:id', updateCategory, {
    detail: {
      security: [{ bearerAuth: [] }],
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
  .delete('/categories/:id', deleteCategory, {
    detail: {
      security: [{ bearerAuth: [] }],
    },
  })
