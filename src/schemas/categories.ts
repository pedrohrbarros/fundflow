import { z } from 'zod'

export const CategoryCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['INCOME', 'EXPENSE']),
})

export const CategoryUpdateSchema = z.object({
  name: z.string().min(1),
})

export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>
