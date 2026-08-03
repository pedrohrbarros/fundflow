import { t } from 'elysia'
import type { Static } from '@sinclair/typebox'

export type ExpensePaymentMethodRecord = {
  id: number
  name: string
  origin: string
}

export type ExpenseRecord = {
  id: number
  name: string
  category_id: number | null
  amount: number
  date: string
  is_recurring: boolean
  recurring_months: number | null
  is_paid: boolean
  is_saved: boolean
  saving_location: string | null
  payment_method_id: number | null
  payment_method: ExpensePaymentMethodRecord | null
  created_at: string
  updated_at: string
}

export type ExpenseSearchRecord = ExpenseRecord & { period_amount: number }

export const ExpenseCreateBody = t.Object({
  name: t.String({ minLength: 1 }),
  category_id: t.Optional(t.Union([t.Integer(), t.Null()])),
  amount: t.Number({ exclusiveMinimum: 0 }),
  date: t.String({ format: 'date' }),
  is_recurring: t.Optional(t.Boolean()),
  recurring_months: t.Optional(t.Union([t.Integer({ minimum: 1 }), t.Null()])),
  is_paid: t.Optional(t.Boolean()),
  paid_period: t.Optional(t.Union([t.String({ pattern: '^\\d{4}-\\d{2}$' }), t.Null()])),
  is_saved: t.Optional(t.Boolean()),
  saving_location: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
  payment_method_id: t.Optional(t.Union([t.Integer(), t.Null()])),
})

export const ExpenseUpdateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  category_id: t.Optional(t.Union([t.Integer(), t.Null()])),
  amount: t.Optional(t.Number({ exclusiveMinimum: 0 })),
  date: t.Optional(t.String({ format: 'date' })),
  is_recurring: t.Optional(t.Boolean()),
  recurring_months: t.Optional(t.Union([t.Integer({ minimum: 1 }), t.Null()])),
  is_paid: t.Optional(t.Boolean()),
  paid_period: t.Optional(t.Union([t.String({ pattern: '^\\d{4}-\\d{2}$' }), t.Null()])),
  is_saved: t.Optional(t.Boolean()),
  saving_location: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
  payment_method_id: t.Optional(t.Union([t.Integer(), t.Null()])),
})

export type ExpenseCreateBodyType = Static<typeof ExpenseCreateBody>
export type ExpenseUpdateBodyType = Static<typeof ExpenseUpdateBody>
