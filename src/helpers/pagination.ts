export const PAGINATION_MAX_LIMIT = 5000
export const PAGINATION_DEFAULT_LIMIT = 20
export const PAGINATION_DEFAULT_PAGE = 1

type PaginationOk = { ok: true; page: number; limit: number }
type PaginationError = { ok: false; error: string }
export type PaginationResult = PaginationOk | PaginationError

export const parsePagination = (query: { page?: string; limit?: string }): PaginationResult => {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || PAGINATION_DEFAULT_PAGE)
  const limitStr = query.limit ?? String(PAGINATION_DEFAULT_LIMIT)
  const limitParsed = parseInt(limitStr, 10)
  const limit = isNaN(limitParsed) ? PAGINATION_DEFAULT_LIMIT : limitParsed
  if (limit < 1) return { ok: false, error: 'limit must be at least 1' }
  if (limit > PAGINATION_MAX_LIMIT)
    return { ok: false, error: `limit must not exceed ${PAGINATION_MAX_LIMIT}` }
  return { ok: true, page, limit }
}
