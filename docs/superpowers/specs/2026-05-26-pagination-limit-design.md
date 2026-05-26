# Pagination for All List Endpoints — Design Spec

**Date:** 2026-05-26
**Branch:** `feature/payment-method-bank` (or new branch)
**Status:** Approved

---

## Problem

Only `GET /api/v1/expenses` supports pagination today. The three other list endpoints (`payment_methods`, `categories`, `sources_of_income`) return all records with no page or limit controls. There is also no enforcement of a maximum page size — the expenses endpoint silently clamps to 100, which gives no feedback to callers sending larger values.

---

## Decision

1. Add `page` + `limit` query parameters to all four list endpoints.
2. Enforce a hard maximum of **5000** per page across all endpoints: requests with `limit > 5000` receive a `400` response.
3. Share all validation logic in a single `parsePagination` helper.
4. Extend the cache middleware with pattern-based invalidation so mutations clear all cached pages for a user.

---

## Architecture

### 1. Shared Pagination Helper

**File:** `src/helpers/pagination.ts` (new)

```ts
export const PAGINATION_MAX_LIMIT = 5000
export const PAGINATION_DEFAULT_LIMIT = 20
export const PAGINATION_DEFAULT_PAGE = 1

type PaginationOk = { ok: true; page: number; limit: number }
type PaginationError = { ok: false; error: string }
export type PaginationResult = PaginationOk | PaginationError

export const parsePagination = (query: { page?: string; limit?: string }): PaginationResult => {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || PAGINATION_DEFAULT_PAGE)
  const limit =
    parseInt(query.limit ?? String(PAGINATION_DEFAULT_LIMIT), 10) || PAGINATION_DEFAULT_LIMIT
  if (limit < 1) return { ok: false, error: 'limit must be at least 1' }
  if (limit > PAGINATION_MAX_LIMIT) return { ok: false, error: `limit must not exceed ${PAGINATION_MAX_LIMIT}` }
  return { ok: true, page, limit }
}
```

- Invalid non-numeric strings for `page` or `limit` fall back to their defaults.
- `page` is clamped to a minimum of 1.
- `limit < 1` and `limit > 5000` both return an error.

Every list route handler calls `parsePagination` first and returns `400` immediately if `ok` is false.

---

### 2. Cache Middleware — `cacheDelPattern`

**File:** `src/middleware/cache.ts` (modify)

Add:

```ts
export const cacheDelPattern = async (pattern: string): Promise<void> => {
  let cursor = '0'
  do {
    const { cursor: nextCursor, keys } = await client.scan(cursor, { MATCH: pattern, COUNT: 100 })
    cursor = nextCursor
    if (keys.length > 0) await client.del(keys)
  } while (cursor !== '0')
}
```

Used by mutating service methods (create, update, delete) to clear all page variants for a user.

---

### 3. Cache Key Changes

| Service | Old key | New key | Invalidation pattern |
|---|---|---|---|
| payment_methods | `payment_methods:list:{uid}` | `payment_methods:list:{uid}:{page}:{limit}` | `payment_methods:list:{uid}:*` |
| categories | `categories:list:{uid}` | `categories:list:{uid}:{page}:{limit}` | `categories:list:{uid}:*` |
| sources_of_income | `sources_of_income:list:{uid}` | `sources_of_income:list:{uid}:{page}:{limit}` | `sources_of_income:list:{uid}:*` |

Expenses does not use caching — no cache changes needed there.

---

### 4. Service Layer Changes

All four `listForUser` methods gain `page: number` and `limit: number` parameters and return a `pagination` object alongside their data.

**Shared return shape addition:**
```ts
pagination: { page: number; limit: number; total: number }
```

- **expenses:** already has `skip`/`take` — only signature and validation change (max raised from 100 to 5000)
- **payment_methods:** add `skip: (page - 1) * limit`, `take: limit`, `count` query alongside `findMany`
- **categories:** add `skip`/`take`, `count` alongside `findMany`
- **sources_of_income:** fetch a page of source records with `skip`/`take`, then group by category name in-memory; `total` is the count of all source records for the user

---

### 5. Route Handler Changes

All four list route handlers:

```ts
const pagination = parsePagination(query)
if (!pagination.ok) return handleError(set, 400, pagination.error)
const result = await Service.listForUser(clerk_user_id, pagination.page, pagination.limit)
```

Query type for each handler changes from `{}` to `{ page?: string; limit?: string }`.

---

### 6. Response Format Changes

| Endpoint | Old response shape | New response shape |
|---|---|---|
| `GET /expenses` | `{ expenses, pagination }` | same — max limit raised to 5000 |
| `GET /payment_methods` | `{ payment_methods: [...] }` | `{ payment_methods: [...], pagination }` |
| `GET /categories` | `{ categories: [...] }` | `{ categories: [...], pagination }` |
| `GET /sources_of_income` | `{ [category]: [...] }` | `{ sources_of_income: { [category]: [...] }, pagination }` |

The `sources_of_income` response gains a `sources_of_income` wrapper key so `pagination` can sit alongside it cleanly.

---

### 7. Tests

#### New: `src/tests/helpers/pagination.test.ts`

Unit tests for `parsePagination`:

| Case | Input | Expected |
|---|---|---|
| Valid defaults | `{}` | `{ ok: true, page: 1, limit: 20 }` |
| Valid explicit | `{ page: '2', limit: '50' }` | `{ ok: true, page: 2, limit: 50 }` |
| Max limit exact | `{ limit: '5000' }` | `{ ok: true, page: 1, limit: 5000 }` |
| Limit too large | `{ limit: '5001' }` | `{ ok: false, error: 'limit must not exceed 5000' }` |
| Limit zero | `{ limit: '0' }` | `{ ok: false, error: 'limit must be at least 1' }` |
| Non-numeric limit | `{ limit: 'abc' }` | `{ ok: true, page: 1, limit: 20 }` (fallback to default) |
| Page below 1 | `{ page: '0' }` | `{ ok: true, page: 1, limit: 20 }` (clamped) |

#### Updated: `src/tests/api/expenses.test.ts`

- Add test: `GET /expenses with limit=5001 returns 400`
- Existing pagination assertions stay as-is

#### Updated: `src/tests/api/payment_methods.test.ts`

- Add test: `GET /payment_methods returns pagination metadata`
- Add test: `GET /payment_methods with limit=5001 returns 400`

#### Updated: `src/tests/api/categories.test.ts`

- Add test: `GET /categories returns pagination metadata`
- Add test: `GET /categories with limit=5001 returns 400`

#### Updated: `src/tests/api/sources_of_income.test.ts`

- Add test: `GET /sources_of_income returns pagination metadata`
- Add test: `GET /sources_of_income with limit=5001 returns 400`

#### Updated: `src/tests/cache/payment_methods.test.ts`

- Update `CACHE_KEY` constant from `payment_methods:list:${TEST_EXTERNAL_ID}` to `payment_methods:list:${TEST_EXTERNAL_ID}:1:20` (default page + limit)

---

## Error Handling

| Condition | Status | Body |
|---|---|---|
| `limit > 5000` | `400` | `{ error: "limit must not exceed 5000" }` |
| `limit < 1` | `400` | `{ error: "limit must be at least 1" }` |
| Non-numeric `page` or `limit` | — | falls back to defaults, no error |

---

## Out of Scope

- No changes to POST / PATCH / DELETE endpoints.
- No uniqueness or ordering changes.
- No changes to the Prisma schema or database.
- No cursor-based pagination — offset/page pagination only.
- No per-endpoint limit overrides — 5000 is the universal maximum.
