import { z } from 'zod'

const ExpensePaymentMethodInput = z.object({
  payment_method_id: z.number().int(),
  partial_amount: z.number().positive(),
})

export const ExpenseCreateSchema = z.object({
  name: z.string().min(1),
  category_id: z.number().int(),
  amount: z.number().positive(),
  is_paid: z.boolean().optional(),
  is_saved: z.boolean().optional(),
  saving_location: z.union([z.string().min(1), z.null()]).optional(),
  payment_methods: z.array(ExpensePaymentMethodInput).optional(),
})

export const ExpenseUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category_id: z.number().int().optional(),
  amount: z.number().positive().optional(),
  is_paid: z.boolean().optional(),
  is_saved: z.boolean().optional(),
  saving_location: z.union([z.string().min(1), z.null()]).optional(),
  payment_methods: z.array(ExpensePaymentMethodInput).optional(),
})

export type ExpenseCreateInput = z.infer<typeof ExpenseCreateSchema>
export type ExpenseUpdateInput = z.infer<typeof ExpenseUpdateSchema>
