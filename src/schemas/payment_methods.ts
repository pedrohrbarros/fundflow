import { z } from 'zod'

export const PaymentMethodCreateSchema = z.object({
  name: z.string().min(1),
  origin: z.string().min(1),
})

export const PaymentMethodUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  origin: z.string().min(1).optional(),
})

export type PaymentMethodCreateInput = z.infer<typeof PaymentMethodCreateSchema>
export type PaymentMethodUpdateInput = z.infer<typeof PaymentMethodUpdateSchema>
