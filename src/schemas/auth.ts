import { z } from 'zod'

export const GoogleLoginSchema = z.object({ id_token: z.string().min(1) })
export const RefreshSchema = z.object({ refresh_token: z.string().min(1) })
export const LogoutSchema = z.object({ refresh_token: z.string().min(1) })
