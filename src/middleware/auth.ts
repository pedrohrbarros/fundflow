import type { Context } from 'elysia'

export function requireAuth({ headers, set }: Pick<Context, 'headers' | 'set'>) {
  const auth = headers['authorization']
  if (!auth?.startsWith('Bearer ')) {
    set.status = 401
    return 'Unauthorized'
  }
  const token = auth.slice(7)
  if (token !== process.env.API_KEY) {
    set.status = 401
    return 'Unauthorized'
  }
}
