import { z } from 'zod'

export const SourceOfIncomeCreateSchema = z.object({
  name: z.string().min(1),
  category_id: z.number().int(),
  income: z.number().min(0).optional(),
})

export const SourceOfIncomeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category_id: z.number().int().optional(),
  income: z.number().min(0).optional(),
})

export type SourceOfIncomeCreateInput = z.infer<typeof SourceOfIncomeCreateSchema>
export type SourceOfIncomeUpdateInput = z.infer<typeof SourceOfIncomeUpdateSchema>
