import { t } from 'elysia'
import type { Static } from '@sinclair/typebox'

export const CategoryCreateBody = t.Object({
  name: t.String({ minLength: 1 }),
})

export const CategoryUpdateBody = t.Object({
  name: t.String({ minLength: 1 }),
})

export type CategoryCreateBodyType = Static<typeof CategoryCreateBody>
export type CategoryUpdateBodyType = Static<typeof CategoryUpdateBody>
