import { z } from 'zod'
import { isValidYMD } from '../helpers/period'

const dateField = z.string().refine(isValidYMD, { message: 'date must be a valid YYYY-MM-DD' })

export const ExpenseCreateSchema = z.object({
  name: z.string().min(1),
  category_id: z.number().int().nullish(),
  amount: z.number().positive(),
  date: dateField,
  is_recurring: z.boolean().optional(),
  recurring_months: z.number().int().min(1).nullish(),
  is_paid: z.boolean().optional(),
  paid_period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .nullish(),
  is_saved: z.boolean().optional(),
  saving_location: z.union([z.string().min(1), z.null()]).optional(),
  payment_method_id: z.number().int().nullish(),
})

export const ExpenseUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category_id: z.number().int().nullish(),
  amount: z.number().positive().optional(),
  date: dateField.optional(),
  is_recurring: z.boolean().optional(),
  recurring_months: z.number().int().min(1).nullish(),
  is_paid: z.boolean().optional(),
  paid_period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .nullish(),
  is_saved: z.boolean().optional(),
  saving_location: z.union([z.string().min(1), z.null()]).optional(),
  payment_method_id: z.number().int().nullish(),
})

export type ExpenseCreateInput = z.infer<typeof ExpenseCreateSchema>
export type ExpenseUpdateInput = z.infer<typeof ExpenseUpdateSchema>
