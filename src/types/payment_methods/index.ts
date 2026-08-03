import { t } from 'elysia'
import type { Static } from '@sinclair/typebox'

export type PaymentMethodRecord = {
  id: number
  name: string
  origin: string
  user_id: number
  created_at: string
  updated_at: string
}

export const PaymentMethodCreateBody = t.Object({
  name: t.String({ minLength: 1 }),
  origin: t.String({ minLength: 1 }),
})

export const PaymentMethodUpdateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  origin: t.Optional(t.String({ minLength: 1 })),
})

export type PaymentMethodCreateBodyType = Static<typeof PaymentMethodCreateBody>
export type PaymentMethodUpdateBodyType = Static<typeof PaymentMethodUpdateBody>
