import { t } from 'elysia'
import type { Static } from '@sinclair/typebox'

export type SourceOfIncomeRecord = {
  id: string
  name: string
  category_id: string
  income: number
  currency: string
  created_at: string
  updated_at: string
}

export type SourcesOfIncomeByCategoryRecord = {
  [category_name: string]: SourceOfIncomeRecord[]
}

export const SourceOfIncomeCreateBody = t.Object({
  name: t.String({ minLength: 1 }),
  category_id: t.Integer(),
  income: t.Optional(t.Number({ minimum: 0 })),
  currency: t.Optional(t.String({ minLength: 3, maxLength: 3, pattern: '^[A-Z]{3}$' })),
})

export const SourceOfIncomeUpdateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  category_id: t.Optional(t.Integer()),
  income: t.Optional(t.Number({ minimum: 0 })),
  currency: t.Optional(t.String({ minLength: 3, maxLength: 3, pattern: '^[A-Z]{3}$' })),
})

export type SourceOfIncomeCreateBodyType = Static<typeof SourceOfIncomeCreateBody>
export type SourceOfIncomeUpdateBodyType = Static<typeof SourceOfIncomeUpdateBody>
