export const PAGINATION_MAX_LIMIT = 5000
export const PAGINATION_DEFAULT_LIMIT = 20
export const PAGINATION_DEFAULT_PAGE = 1
export const PAGINATION_MAX_PAGE = 10000

type PaginationOk = { ok: true; page: number; limit: number }
type PaginationError = { ok: false; error: string }
export type PaginationResult = PaginationOk | PaginationError

export const parsePagination = (query: { page?: string; limit?: string }): PaginationResult => {
  const rawPage = parseInt(query.page ?? '', 10)
  const page = isNaN(rawPage) || rawPage < 1 ? PAGINATION_DEFAULT_PAGE : rawPage

  const rawLimit = parseInt(query.limit ?? '', 10)
  const limit = isNaN(rawLimit) ? PAGINATION_DEFAULT_LIMIT : rawLimit

  if (limit < 1) return { ok: false, error: 'limit must be at least 1' }
  if (limit > PAGINATION_MAX_LIMIT)
    return { ok: false, error: `limit must not exceed ${PAGINATION_MAX_LIMIT}` }
  if (page > PAGINATION_MAX_PAGE)
    return { ok: false, error: `page must not exceed ${PAGINATION_MAX_PAGE}` }
  return { ok: true, page, limit }
}
