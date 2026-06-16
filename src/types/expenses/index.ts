import { t } from 'elysia'
import type { Static } from '@sinclair/typebox'

export type ExpensePaymentMethodRecord = {
  payment_method_id: number
  partial_amount: number
  name: string
  origin: string
  receiver: string | null
}

export type ExpenseRecord = {
  id: number
  name: string
  category_id: number
  amount: number
  date: string
  is_recurring: boolean
  is_paid: boolean
  is_saved: boolean
  saving_location: string | null
  payment_methods: ExpensePaymentMethodRecord[]
  created_at: string
  updated_at: string
}

export type ExpenseSearchRecord = ExpenseRecord & { period_amount: number }

const ExpensePaymentMethodInput = t.Object({
  payment_method_id: t.Integer(),
  partial_amount: t.Number({ exclusiveMinimum: 0 }),
})

export const ExpenseCreateBody = t.Object({
  name: t.String({ minLength: 1 }),
  category_id: t.Integer(),
  amount: t.Number({ exclusiveMinimum: 0 }),
  date: t.String({ format: 'date' }),
  is_recurring: t.Optional(t.Boolean()),
  is_paid: t.Optional(t.Boolean()),
  is_saved: t.Optional(t.Boolean()),
  saving_location: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
  payment_methods: t.Optional(t.Array(ExpensePaymentMethodInput)),
})

export const ExpenseUpdateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  category_id: t.Optional(t.Integer()),
  amount: t.Optional(t.Number({ exclusiveMinimum: 0 })),
  date: t.Optional(t.String({ format: 'date' })),
  is_recurring: t.Optional(t.Boolean()),
  is_paid: t.Optional(t.Boolean()),
  is_saved: t.Optional(t.Boolean()),
  saving_location: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
  payment_methods: t.Optional(t.Array(ExpensePaymentMethodInput)),
})

export type ExpenseCreateBodyType = Static<typeof ExpenseCreateBody>
export type ExpenseUpdateBodyType = Static<typeof ExpenseUpdateBody>
