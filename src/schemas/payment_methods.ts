import { z } from 'zod'

export const PaymentMethodCreateSchema = z.object({
  name: z.string().min(1),
  bank: z.string().min(1).optional(),
  receiver: z.string().min(1).optional(),
})

export const PaymentMethodUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  bank: z.union([z.string().min(1), z.null()]).optional(),
  receiver: z.union([z.string().min(1), z.null()]).optional(),
})

export type PaymentMethodCreateInput = z.infer<typeof PaymentMethodCreateSchema>
export type PaymentMethodUpdateInput = z.infer<typeof PaymentMethodUpdateSchema>
