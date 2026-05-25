import { t } from 'elysia'
import type { Static } from '@sinclair/typebox'

export type PaymentMethodRecord = {
  id: string
  name: string
  origin: string
  receiver: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export const PaymentMethodCreateBody = t.Object({
  name: t.String({ minLength: 1 }),
  origin: t.String({ minLength: 1 }),
  receiver: t.Optional(t.String({ minLength: 1 })),
})

export const PaymentMethodUpdateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  origin: t.Optional(t.String({ minLength: 1 })),
  receiver: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
})

export type PaymentMethodCreateBodyType = Static<typeof PaymentMethodCreateBody>
export type PaymentMethodUpdateBodyType = Static<typeof PaymentMethodUpdateBody>
