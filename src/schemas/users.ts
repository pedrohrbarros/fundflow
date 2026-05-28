import { z } from 'zod'

export const UpdateCountrySchema = z.object({
  country: z
    .string()
    .length(2)
    .transform((value) => value.toUpperCase())
    .regex(/^[A-Z]{2}$/),
})

export type UpdateCountryInput = z.infer<typeof UpdateCountrySchema>
