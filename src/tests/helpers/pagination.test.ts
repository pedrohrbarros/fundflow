import { describe, it, expect } from 'bun:test'
import {
  parsePagination,
  PAGINATION_MAX_LIMIT,
  PAGINATION_MAX_PAGE,
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_DEFAULT_PAGE,
} from '../../helpers/pagination'

describe('parsePagination', () => {
  it('returns defaults when query is empty', () => {
    const result = parsePagination({})
    expect(result).toEqual({
      ok: true,
      page: PAGINATION_DEFAULT_PAGE,
      limit: PAGINATION_DEFAULT_LIMIT,
    })
  })

  it('parses valid page and limit', () => {
    const result = parsePagination({ page: '2', limit: '50' })
    expect(result).toEqual({ ok: true, page: 2, limit: 50 })
  })

  it('accepts the maximum limit exactly', () => {
    const result = parsePagination({ limit: String(PAGINATION_MAX_LIMIT) })
    expect(result).toEqual({ ok: true, page: 1, limit: PAGINATION_MAX_LIMIT })
  })

  it('returns error when limit exceeds maximum', () => {
    const result = parsePagination({ limit: String(PAGINATION_MAX_LIMIT + 1) })
    expect(result).toEqual({ ok: false, error: `limit must not exceed ${PAGINATION_MAX_LIMIT}` })
  })

  it('returns error when limit is zero', () => {
    const result = parsePagination({ limit: '0' })
    expect(result).toEqual({ ok: false, error: 'limit must be at least 1' })
  })

  it('returns error when limit is negative', () => {
    const result = parsePagination({ limit: '-1' })
    expect(result).toEqual({ ok: false, error: 'limit must be at least 1' })
  })

  it('falls back to default limit for non-numeric string', () => {
    const result = parsePagination({ limit: 'abc' })
    expect(result).toEqual({ ok: true, page: 1, limit: PAGINATION_DEFAULT_LIMIT })
  })

  it('clamps page to 1 when page is 0', () => {
    const result = parsePagination({ page: '0' })
    expect(result).toEqual({ ok: true, page: 1, limit: PAGINATION_DEFAULT_LIMIT })
  })

  it('falls back to default page for non-numeric string', () => {
    const result = parsePagination({ page: 'abc' })
    expect(result).toEqual({ ok: true, page: 1, limit: PAGINATION_DEFAULT_LIMIT })
  })

  it('accepts the maximum page exactly', () => {
    const result = parsePagination({ page: String(PAGINATION_MAX_PAGE) })
    expect(result).toEqual({ ok: true, page: PAGINATION_MAX_PAGE, limit: PAGINATION_DEFAULT_LIMIT })
  })

  it('returns error when page exceeds maximum', () => {
    const result = parsePagination({ page: String(PAGINATION_MAX_PAGE + 1) })
    expect(result).toEqual({ ok: false, error: `page must not exceed ${PAGINATION_MAX_PAGE}` })
  })
})
