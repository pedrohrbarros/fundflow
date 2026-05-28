import { z } from 'zod'

export const UpdateCountrySchema = z.object({
  country: z
    .string()
    .length(2)
    .transform((value) => value.toUpperCase())
    .refine((value) => /^[A-Z]{2}$/.test(value)),
})

export type UpdateCountryInput = z.infer<typeof UpdateCountrySchema>
