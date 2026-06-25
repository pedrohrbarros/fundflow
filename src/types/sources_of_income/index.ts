import { t } from 'elysia'
import type { Static } from '@sinclair/typebox'

export type SourceOfIncomeRecord = {
  id: number
  name: string
  category_id: number | null
  income: number
  currency: string
  date: string
  is_recurring: boolean
  created_at: string
  updated_at: string
}

export type SourceOfIncomeSearchRecord = SourceOfIncomeRecord & { period_amount: number }

export const SourceOfIncomeCreateBody = t.Object({
  name: t.String({ minLength: 1 }),
  category_id: t.Optional(t.Union([t.Integer(), t.Null()])),
  income: t.Optional(t.Number({ minimum: 0 })),
  currency: t.Optional(t.String({ minLength: 3, maxLength: 3, pattern: '^[A-Z]{3}$' })),
  date: t.String({ format: 'date' }),
  is_recurring: t.Optional(t.Boolean()),
})

export const SourceOfIncomeUpdateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  category_id: t.Optional(t.Union([t.Integer(), t.Null()])),
  income: t.Optional(t.Number({ minimum: 0 })),
  currency: t.Optional(t.String({ minLength: 3, maxLength: 3, pattern: '^[A-Z]{3}$' })),
  date: t.Optional(t.String({ format: 'date' })),
  is_recurring: t.Optional(t.Boolean()),
})

export type SourceOfIncomeCreateBodyType = Static<typeof SourceOfIncomeCreateBody>
export type SourceOfIncomeUpdateBodyType = Static<typeof SourceOfIncomeUpdateBody>
