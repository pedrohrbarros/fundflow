import { z } from 'zod'

export const PaymentMethodCreateSchema = z.object({
  name: z.string().min(1),
  origin: z.string().min(1),
  receiver: z.string().min(1).optional(),
})

export const PaymentMethodUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  origin: z.string().min(1).optional(),
  receiver: z.union([z.string().min(1), z.null()]).optional(),
})

export type PaymentMethodCreateInput = z.infer<typeof PaymentMethodCreateSchema>
export type PaymentMethodUpdateInput = z.infer<typeof PaymentMethodUpdateSchema>
