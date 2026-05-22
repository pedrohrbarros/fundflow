import { t } from 'elysia'
import type { Static } from '@sinclair/typebox'

export type SourceOfIncomeRecord = {
  id: string
  name: string
  category_id: string
  income: number
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
})

export const SourceOfIncomeUpdateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  category_id: t.Optional(t.Integer()),
  income: t.Optional(t.Number({ minimum: 0 })),
})

export type SourceOfIncomeCreateBodyType = Static<typeof SourceOfIncomeCreateBody>
export type SourceOfIncomeUpdateBodyType = Static<typeof SourceOfIncomeUpdateBody>
