import { t } from 'elysia'
import type { Static } from '@sinclair/typebox'

export const UpdateCountryBody = t.Object({
  country: t.String({ minLength: 2, maxLength: 2, pattern: '^[A-Z]{2}$' }),
})

export type UpdateCountryBodyType = Static<typeof UpdateCountryBody>
