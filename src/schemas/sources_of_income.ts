import { z } from 'zod'
import { isValidYMD } from '../helpers/period'

const dateField = z.string().refine(isValidYMD, { message: 'date must be a valid YYYY-MM-DD' })

export const SourceOfIncomeCreateSchema = z.object({
  name: z.string().min(1),
  category_id: z.number().int().nullish(),
  income: z.number().min(0).optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  date: dateField,
  is_recurring: z.boolean().optional(),
})

export const SourceOfIncomeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category_id: z.number().int().nullish(),
  income: z.number().min(0).optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  date: dateField.optional(),
  is_recurring: z.boolean().optional(),
})

export type SourceOfIncomeCreateInput = z.infer<typeof SourceOfIncomeCreateSchema>
export type SourceOfIncomeUpdateInput = z.infer<typeof SourceOfIncomeUpdateSchema>
