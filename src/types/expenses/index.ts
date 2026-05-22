import { t } from 'elysia'
import type { Static } from '@sinclair/typebox'

export type ExpensePaymentMethodRecord = {
  payment_method_id: string
  partial_amount: number
  name: string
  bank: string | null
  receiver: string | null
}

export type ExpenseRecord = {
  id: string
  name: string
  amount: number
  is_paid: boolean
  is_saved: boolean
  saving_location: string | null
  payment_methods: ExpensePaymentMethodRecord[]
  created_at: string
  updated_at: string
}

const ExpensePaymentMethodInput = t.Object({
  payment_method_id: t.Integer(),
  partial_amount: t.Number({ exclusiveMinimum: 0 }),
})

export const ExpenseCreateBody = t.Object({
  name: t.String({ minLength: 1 }),
  amount: t.Number({ exclusiveMinimum: 0 }),
  is_paid: t.Optional(t.Boolean()),
  is_saved: t.Optional(t.Boolean()),
  saving_location: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
  payment_methods: t.Optional(t.Array(ExpensePaymentMethodInput)),
})

export const ExpenseUpdateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  amount: t.Optional(t.Number({ exclusiveMinimum: 0 })),
  is_paid: t.Optional(t.Boolean()),
  is_saved: t.Optional(t.Boolean()),
  saving_location: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
  payment_methods: t.Optional(t.Array(ExpensePaymentMethodInput)),
})

export type ExpenseCreateBodyType = Static<typeof ExpenseCreateBody>
export type ExpenseUpdateBodyType = Static<typeof ExpenseUpdateBody>
