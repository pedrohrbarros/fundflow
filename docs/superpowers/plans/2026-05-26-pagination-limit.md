# Pagination for All List Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `page`/`limit` query parameters with a 5000-per-page hard cap to all four list endpoints (`expenses`, `payment_methods`, `categories`, `sources_of_income`), returning a `pagination` object in every response.

**Architecture:** A shared `parsePagination` helper centralises query parsing and limit validation — every list route calls it first and returns `400` on violation. Cache middleware gains a `cacheDelPattern` function (Redis SCAN loop) so mutations invalidate all page variants at once. Each service's `listForUser` gains `page` and `limit` parameters and uses Prisma `skip`/`take`.

**Tech Stack:** Bun runtime, Elysia web framework, Prisma ORM (PostgreSQL), Redis (node-redis v5), TypeScript, bun:test.

---

## File Map

| Action | File | What changes |
|---|---|---|
| **Create** | `src/helpers/pagination.ts` | `parsePagination` — parse, clamp, validate |
| **Create** | `src/tests/helpers/pagination.test.ts` | Unit tests for `parsePagination` |
| **Modify** | `src/middleware/cache.ts` | Add `cacheDelPattern` |
| **Modify** | `src/services/payment_methods.ts` | `listForUser(uid, page, limit)`, paginated cache key, `cacheDelPattern` |
| **Modify** | `src/routes/v1/payment_methods/list.ts` | Use `parsePagination`, return `result.data` directly |
| **Modify** | `src/tests/api/payment_methods.test.ts` | Add pagination + limit>5000 tests |
| **Modify** | `src/tests/cache/payment_methods.test.ts` | Update `CACHE_KEY` to include `:1:20` |
| **Modify** | `src/services/categories.ts` | Same pattern as payment_methods |
| **Modify** | `src/routes/v1/categories/list.ts` | Same pattern |
| **Modify** | `src/tests/api/categories.test.ts` | Add pagination + limit>5000 tests |
| **Modify** | `src/services/sources_of_income.ts` | `listForUser(uid, page, limit)` — paginate sources, group in memory |
| **Modify** | `src/routes/v1/sources_of_income/list.ts` | Same pattern |
| **Modify** | `src/tests/api/sources_of_income.test.ts` | Update GET assertions (response shape changes), add pagination + limit>5000 tests |
| **Modify** | `src/routes/v1/expenses/list.ts` | Replace inline Math.min/max with `parsePagination` |
| **Modify** | `src/tests/api/expenses.test.ts` | Add limit>5000 test |

---

### Task 1: `parsePagination` Helper + Unit Tests

**Files:**
- Create: `src/helpers/pagination.ts`
- Create: `src/tests/helpers/pagination.test.ts`

- [ ] **Step 1: Write the failing unit tests**

Create `src/tests/helpers/pagination.test.ts`:

```ts
import { describe, it, expect } from 'bun:test'
import {
  parsePagination,
  PAGINATION_MAX_LIMIT,
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_DEFAULT_PAGE,
} from '../../helpers/pagination'

describe('parsePagination', () => {
  it('returns defaults when query is empty', () => {
    const result = parsePagination({})
    expect(result).toEqual({ ok: true, page: PAGINATION_DEFAULT_PAGE, limit: PAGINATION_DEFAULT_LIMIT })
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
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun test src/tests/helpers/pagination.test.ts
```

Expected: FAIL — `Cannot find module '../../helpers/pagination'`

- [ ] **Step 3: Create the helper**

Create `src/helpers/pagination.ts`:

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
  if (limit > PAGINATION_MAX_LIMIT)
    return { ok: false, error: `limit must not exceed ${PAGINATION_MAX_LIMIT}` }
  return { ok: true, page, limit }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
bun test src/tests/helpers/pagination.test.ts
```

Expected: 9 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add src/helpers/pagination.ts src/tests/helpers/pagination.test.ts
git commit -m "feat: add parsePagination helper with 5000 max limit"
```

---

### Task 2: `cacheDelPattern` in Cache Middleware

**Files:**
- Modify: `src/middleware/cache.ts`

- [ ] **Step 1: Add `cacheDelPattern` to the cache middleware**

Current file (`src/middleware/cache.ts`):
```ts
import { client } from '../config/redis'

const DEFAULT_TTL = 300

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const value = await client.get(key)
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const cacheSet = async (
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL
): Promise<void> => {
  await client.set(key, JSON.stringify(value), { EX: ttlSeconds })
}

export const cacheDel = async (key: string): Promise<void> => {
  await client.del(key)
}
```

Replace with:
```ts
import { client } from '../config/redis'

const DEFAULT_TTL = 300

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const value = await client.get(key)
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const cacheSet = async (
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL
): Promise<void> => {
  await client.set(key, JSON.stringify(value), { EX: ttlSeconds })
}

export const cacheDel = async (key: string): Promise<void> => {
  await client.del(key)
}

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  let cursor = 0
  do {
    const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 })
    cursor = Number(result.cursor)
    if (result.keys.length > 0) await client.del(result.keys)
  } while (cursor !== 0)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/pedro.barros/Desktop/Projects/fundflow && bunx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/middleware/cache.ts
git commit -m "feat: add cacheDelPattern to cache middleware"
```

---

### Task 3: Payment Methods Pagination

**Files:**
- Modify: `src/services/payment_methods.ts`
- Modify: `src/routes/v1/payment_methods/list.ts`
- Modify: `src/tests/api/payment_methods.test.ts`
- Modify: `src/tests/cache/payment_methods.test.ts`

- [ ] **Step 1: Write the failing API tests**

In `src/tests/api/payment_methods.test.ts`, add two new tests inside the `describe('Payment Methods API', ...)` block, after the existing GET test:

```ts
it('GET /api/v1/payment_methods returns pagination metadata', async () => {
  const token = await makeToken(TEST_EXTERNAL_ID)
  const res = await req('GET', '/api/v1/payment_methods', token)
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.pagination).toBeDefined()
  expect(typeof json.pagination.page).toBe('number')
  expect(typeof json.pagination.limit).toBe('number')
  expect(typeof json.pagination.total).toBe('number')
})

it('GET /api/v1/payment_methods with limit=5001 returns 400', async () => {
  const token = await makeToken(TEST_EXTERNAL_ID)
  const res = await req('GET', '/api/v1/payment_methods?limit=5001', token)
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Run tests — verify the new ones fail**

```bash
bun test src/tests/api/payment_methods.test.ts
```

Expected: 8 pass, 2 fail (the two new tests)

- [ ] **Step 3: Update the cache test key**

In `src/tests/cache/payment_methods.test.ts`, change line 18:

```ts
// Before
const CACHE_KEY = `payment_methods:list:${TEST_EXTERNAL_ID}`

// After
const CACHE_KEY = `payment_methods:list:${TEST_EXTERNAL_ID}:1:20`
```

- [ ] **Step 4: Update the payment methods service**

Replace `src/services/payment_methods.ts` entirely:

```ts
import { db } from '../config/db'
import { cacheGet, cacheSet, cacheDelPattern } from '../middleware/cache'
import { db_logger } from '../config/logging'
import type { ServiceResult } from './types'
import type { PaymentMethodRecord } from '../types/payment_methods'

type PaymentMethodListData = {
  payment_methods: PaymentMethodRecord[]
  pagination: { page: number; limit: number; total: number }
}

const pmCacheKey = (user_external_id: string, page: number, limit: number) =>
  `payment_methods:list:${user_external_id}:${page}:${limit}`

const pmCachePattern = (user_external_id: string) =>
  `payment_methods:list:${user_external_id}:*`

export const PaymentMethodsService = {
  async create(
    user_external_id: string,
    name: string,
    origin: string,
    receiver?: string
  ): Promise<ServiceResult<PaymentMethodRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const count = await db.paymentMethod.count({ where: { user_id: user.id } })
      if (count >= 100)
        return { ok: false, status: 400, message: 'Payment method limit reached (100 per user)' }
      const payment_method = await db.paymentMethod.create({
        data: { name, origin, receiver: receiver ?? null, user_id: user.id },
      })
      await cacheDelPattern(pmCachePattern(user_external_id))
      return {
        ok: true,
        data: {
          id: payment_method.id.toString(),
          name: payment_method.name,
          origin: payment_method.origin,
          receiver: payment_method.receiver,
          user_id: payment_method.user_id.toString(),
          created_at: payment_method.created_at.toISOString(),
          updated_at: payment_method.updated_at.toISOString(),
        },
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to create payment method',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async listForUser(
    user_external_id: string,
    page: number,
    limit: number
  ): Promise<ServiceResult<PaymentMethodListData>> {
    const key = pmCacheKey(user_external_id, page, limit)
    const cached = await cacheGet<PaymentMethodListData>(key)
    if (cached) return { ok: true, data: cached }
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const [payment_methods, total] = await db.$transaction([
        db.paymentMethod.findMany({
          where: { user_id: user.id },
          orderBy: { id: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.paymentMethod.count({ where: { user_id: user.id } }),
      ])
      const data: PaymentMethodListData = {
        payment_methods: payment_methods.map((pm) => ({
          id: pm.id.toString(),
          name: pm.name,
          origin: pm.origin,
          receiver: pm.receiver,
          user_id: pm.user_id.toString(),
          created_at: pm.created_at.toISOString(),
          updated_at: pm.updated_at.toISOString(),
        })),
        pagination: { page, limit, total },
      }
      await cacheSet(key, data)
      return { ok: true, data }
    } catch (err: unknown) {
      db_logger.error(err, 'Failed to fetch payment methods')
      return {
        ok: false,
        status: 500,
        message: 'Failed to fetch payment methods',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async update(
    id: bigint,
    user_external_id: string,
    data: { name?: string; origin?: string; receiver?: string | null }
  ): Promise<ServiceResult<PaymentMethodRecord>> {
    if (Object.keys(data).length === 0)
      return { ok: false, status: 400, message: 'No fields to update' }

    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const payment_method = await db.paymentMethod.update({
        where: { id, user_id: user.id },
        data,
      })
      await cacheDelPattern(pmCachePattern(user_external_id))
      return {
        ok: true,
        data: {
          id: payment_method.id.toString(),
          name: payment_method.name,
          origin: payment_method.origin,
          receiver: payment_method.receiver,
          user_id: payment_method.user_id.toString(),
          created_at: payment_method.created_at.toISOString(),
          updated_at: payment_method.updated_at.toISOString(),
        },
      }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Payment method not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to update payment method',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async remove(id: bigint, user_external_id: string): Promise<ServiceResult<{ message: string }>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      await db.paymentMethod.delete({ where: { id, user_id: user.id } })
      await cacheDelPattern(pmCachePattern(user_external_id))
      return { ok: true, data: { message: 'Payment method deleted' } }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Payment method not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to delete payment method',
        meta: { error: (err as Error)?.message },
      }
    }
  },
}
```

- [ ] **Step 5: Update the payment methods list route**

Replace `src/routes/v1/payment_methods/list.ts` entirely:

```ts
import { PaymentMethodsService } from '../../../services/payment_methods'
import { handleError } from '../../../middleware/error'
import { parsePagination } from '../../../helpers/pagination'

export const listPaymentMethods = async ({
  clerk_user_id,
  query,
  set,
}: {
  clerk_user_id: string
  query: { page?: string; limit?: string }
  set: { status?: number | string }
}) => {
  const pagination = parsePagination(query)
  if (!pagination.ok) return handleError(set, 400, pagination.error)
  const result = await PaymentMethodsService.listForUser(
    clerk_user_id,
    pagination.page,
    pagination.limit
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
```

- [ ] **Step 6: Run all payment methods tests — verify they all pass**

```bash
bun test src/tests/api/payment_methods.test.ts src/tests/cache/payment_methods.test.ts
```

Expected: 10 pass (8 API + 1 cache + 1 new pagination metadata) and the limit>5000 test, total 10 pass, 0 fail

- [ ] **Step 7: Commit**

```bash
git add src/services/payment_methods.ts src/routes/v1/payment_methods/list.ts \
  src/tests/api/payment_methods.test.ts src/tests/cache/payment_methods.test.ts
git commit -m "feat: add pagination to payment methods list endpoint"
```

---

### Task 4: Categories Pagination

**Files:**
- Modify: `src/services/categories.ts`
- Modify: `src/routes/v1/categories/list.ts`
- Modify: `src/tests/api/categories.test.ts`

- [ ] **Step 1: Write the failing API tests**

In `src/tests/api/categories.test.ts`, add two tests inside the `describe('Categories API', ...)` block, after the existing GET test:

```ts
it('GET /api/v1/categories returns pagination metadata', async () => {
  const res = await req('GET', '/api/v1/categories')
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.pagination).toBeDefined()
  expect(typeof json.pagination.page).toBe('number')
  expect(typeof json.pagination.limit).toBe('number')
  expect(typeof json.pagination.total).toBe('number')
})

it('GET /api/v1/categories with limit=5001 returns 400', async () => {
  const res = await req('GET', '/api/v1/categories?limit=5001')
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Run tests — verify the new ones fail**

```bash
bun test src/tests/api/categories.test.ts
```

Expected: 7 pass, 2 fail (the two new tests)

- [ ] **Step 3: Update the categories service**

Replace `src/services/categories.ts` entirely:

```ts
import { db } from '../config/db'
import { cacheGet, cacheSet, cacheDelPattern } from '../middleware/cache'
import type { ServiceResult } from './types'

type CategoryRecord = { id: string; name: string; created_at: string; updated_at: string }

type CategoryListData = {
  categories: CategoryRecord[]
  pagination: { page: number; limit: number; total: number }
}

const catCacheKey = (user_external_id: string, page: number, limit: number) =>
  `categories:list:${user_external_id}:${page}:${limit}`

const catCachePattern = (user_external_id: string) => `categories:list:${user_external_id}:*`

export const CategoriesService = {
  async create(user_external_id: string, name: string): Promise<ServiceResult<CategoryRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const count = await db.sourceOfIncomeCategory.count({ where: { user_id: user.id } })
      if (count >= 100)
        return { ok: false, status: 400, message: 'Category limit reached (100 per user)' }
      const category = await db.sourceOfIncomeCategory.create({
        data: { name, user_id: user.id },
      })
      await cacheDelPattern(catCachePattern(user_external_id))
      return {
        ok: true,
        data: {
          id: category.id.toString(),
          name: category.name,
          created_at: category.created_at.toISOString(),
          updated_at: category.updated_at.toISOString(),
        },
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to create category',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async listForUser(
    user_external_id: string,
    page: number,
    limit: number
  ): Promise<ServiceResult<CategoryListData>> {
    const key = catCacheKey(user_external_id, page, limit)
    const cached = await cacheGet<CategoryListData>(key)
    if (cached) return { ok: true, data: cached }
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const [categories, total] = await db.$transaction([
        db.sourceOfIncomeCategory.findMany({
          where: { user_id: user.id },
          orderBy: { id: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.sourceOfIncomeCategory.count({ where: { user_id: user.id } }),
      ])
      const data: CategoryListData = {
        categories: categories.map((c) => ({
          id: c.id.toString(),
          name: c.name,
          created_at: c.created_at.toISOString(),
          updated_at: c.updated_at.toISOString(),
        })),
        pagination: { page, limit, total },
      }
      await cacheSet(key, data)
      return { ok: true, data }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to fetch categories',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async update(
    id: bigint,
    user_external_id: string,
    name: string
  ): Promise<ServiceResult<CategoryRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const category = await db.sourceOfIncomeCategory.update({
        where: { id, user_id: user.id },
        data: { name },
      })
      await cacheDelPattern(catCachePattern(user_external_id))
      return {
        ok: true,
        data: {
          id: category.id.toString(),
          name: category.name,
          created_at: category.created_at.toISOString(),
          updated_at: category.updated_at.toISOString(),
        },
      }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Category not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to update category',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async remove(id: bigint, user_external_id: string): Promise<ServiceResult<{ message: string }>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      await db.sourceOfIncomeCategory.delete({ where: { id, user_id: user.id } })
      await cacheDelPattern(catCachePattern(user_external_id))
      return { ok: true, data: { message: 'Category deleted' } }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Category not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to delete category',
        meta: { error: (err as Error)?.message },
      }
    }
  },
}
```

- [ ] **Step 4: Update the categories list route**

Replace `src/routes/v1/categories/list.ts` entirely:

```ts
import { CategoriesService } from '../../../services/categories'
import { handleError } from '../../../middleware/error'
import { parsePagination } from '../../../helpers/pagination'

export const listCategories = async ({
  clerk_user_id,
  query,
  set,
}: {
  clerk_user_id: string
  query: { page?: string; limit?: string }
  set: { status?: number | string }
}) => {
  const pagination = parsePagination(query)
  if (!pagination.ok) return handleError(set, 400, pagination.error)
  const result = await CategoriesService.listForUser(
    clerk_user_id,
    pagination.page,
    pagination.limit
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
```

- [ ] **Step 5: Run all categories tests — verify they all pass**

```bash
bun test src/tests/api/categories.test.ts
```

Expected: 9 pass, 0 fail

- [ ] **Step 6: Commit**

```bash
git add src/services/categories.ts src/routes/v1/categories/list.ts \
  src/tests/api/categories.test.ts
git commit -m "feat: add pagination to categories list endpoint"
```

---

### Task 5: Sources of Income Pagination

**Files:**
- Modify: `src/services/sources_of_income.ts`
- Modify: `src/routes/v1/sources_of_income/list.ts`
- Modify: `src/tests/api/sources_of_income.test.ts`

**Context:** The response shape changes. Previously `GET /api/v1/sources_of_income` returned `{ [categoryName]: SourceRecord[] }` flat. Now it returns `{ sources_of_income: { [categoryName]: SourceRecord[] }, pagination: {...} }`. The existing test explicitly asserts `'sources_of_income' in json === false` — that assertion must flip to `true`, and all accesses to `json.[category]` must become `json.sources_of_income.[category]`.

- [ ] **Step 1: Write the failing API tests and update the broken assertion**

Replace the GET test and add pagination/limit tests in `src/tests/api/sources_of_income.test.ts`. Find the existing `'GET /api/v1/sources_of_income returns sources grouped by category'` test and replace it with:

```ts
it('GET /api/v1/sources_of_income returns sources grouped by category with pagination', async () => {
  await req('POST', '/api/v1/sources_of_income', {
    name: `test-soi-${TS}-list`,
    category_id: Number(test_category_id),
  })
  const res = await req('GET', '/api/v1/sources_of_income')
  expect(res.status).toBe(200)
  const json = await res.json()
  // Response is now wrapped: { sources_of_income: {...}, pagination: {...} }
  expect('sources_of_income' in json).toBe(true)
  expect('pagination' in json).toBe(true)
  expect(typeof json.pagination.page).toBe('number')
  expect(typeof json.pagination.limit).toBe('number')
  expect(typeof json.pagination.total).toBe('number')
  // Keys inside sources_of_income are category names (strings), values are arrays
  const category_names = Object.keys(json.sources_of_income)
  expect(category_names.length).toBeGreaterThan(0)
  for (const key of category_names) {
    expect(Array.isArray(json.sources_of_income[key])).toBe(true)
  }
  // Each entry has the expected shape
  const all_sources = Object.values(
    json.sources_of_income as Record<string, { id: string; name: string; income: number }[]>
  ).flat()
  const first_source = all_sources[0]
  expect(typeof first_source.id).toBe('string')
  expect(typeof first_source.name).toBe('string')
  expect(typeof first_source.income).toBe('number')
  // The source we created appears under its category
  expect(all_sources.some((s) => s.name === `test-soi-${TS}-list`)).toBe(true)
})
```

Also add these two new tests at the end of the `describe` block:

```ts
it('GET /api/v1/sources_of_income returns pagination metadata', async () => {
  const res = await req('GET', '/api/v1/sources_of_income')
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.pagination).toBeDefined()
  expect(typeof json.pagination.page).toBe('number')
  expect(typeof json.pagination.limit).toBe('number')
  expect(typeof json.pagination.total).toBe('number')
})

it('GET /api/v1/sources_of_income with limit=5001 returns 400', async () => {
  const res = await req('GET', '/api/v1/sources_of_income?limit=5001')
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Run tests — verify the updated/new ones fail**

```bash
bun test src/tests/api/sources_of_income.test.ts
```

Expected: 7 pass, 3 fail (updated GET, pagination metadata, and limit>5000)

- [ ] **Step 3: Update the sources of income service**

Replace `src/services/sources_of_income.ts` entirely:

```ts
import { db } from '../config/db'
import { cacheGet, cacheSet, cacheDelPattern } from '../middleware/cache'
import { db_logger } from '../config/logging'
import type { ServiceResult } from './types'
import type {
  SourceOfIncomeRecord,
  SourcesOfIncomeByCategoryRecord,
} from '../types/sources_of_income'

type SourcesOfIncomeListData = {
  sources_of_income: SourcesOfIncomeByCategoryRecord
  pagination: { page: number; limit: number; total: number }
}

const soiCacheKey = (user_external_id: string, page: number, limit: number) =>
  `sources_of_income:list:${user_external_id}:${page}:${limit}`

const soiCachePattern = (user_external_id: string) =>
  `sources_of_income:list:${user_external_id}:*`

export const SourcesOfIncomeService = {
  async create(
    user_external_id: string,
    name: string,
    category_id: bigint,
    income?: number
  ): Promise<ServiceResult<SourceOfIncomeRecord>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const count = await db.sourceOfIncome.count({ where: { user_id: user.id } })
      if (count >= 100)
        return { ok: false, status: 400, message: 'Source of income limit reached (100 per user)' }
      const category = await db.sourceOfIncomeCategory.findFirst({
        where: { id: category_id, user_id: user.id },
      })
      if (!category)
        return {
          ok: false,
          status: 404,
          message: 'Category not found',
          meta: { category_id: category_id.toString() },
        }
      const source_of_income = await db.sourceOfIncome.create({
        data: { name, category_id, user_id: user.id, ...(income !== undefined ? { income } : {}) },
      })
      await cacheDelPattern(soiCachePattern(user_external_id))
      return {
        ok: true,
        data: {
          id: source_of_income.id.toString(),
          name: source_of_income.name,
          category_id: source_of_income.category_id.toString(),
          income: source_of_income.income,
          created_at: source_of_income.created_at.toISOString(),
          updated_at: source_of_income.updated_at.toISOString(),
        },
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to create source of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async listForUser(
    user_external_id: string,
    page: number,
    limit: number
  ): Promise<ServiceResult<SourcesOfIncomeListData>> {
    const key = soiCacheKey(user_external_id, page, limit)
    const cached = await cacheGet<SourcesOfIncomeListData>(key)
    if (cached) return { ok: true, data: cached }
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      const [sources, total] = await db.$transaction([
        db.sourceOfIncome.findMany({
          where: { user_id: user.id },
          orderBy: { id: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { category: true },
        }),
        db.sourceOfIncome.count({ where: { user_id: user.id } }),
      ])
      const sources_of_income: SourcesOfIncomeByCategoryRecord = {}
      for (const source of sources) {
        const category_name = source.category.name
        if (!sources_of_income[category_name]) sources_of_income[category_name] = []
        sources_of_income[category_name].push({
          id: source.id.toString(),
          name: source.name,
          category_id: source.category_id.toString(),
          income: source.income,
          created_at: source.created_at.toISOString(),
          updated_at: source.updated_at.toISOString(),
        })
      }
      const data: SourcesOfIncomeListData = {
        sources_of_income,
        pagination: { page, limit, total },
      }
      await cacheSet(key, data)
      return { ok: true, data }
    } catch (err: unknown) {
      db_logger.error(err, 'Failed to fetch sources of income')
      return {
        ok: false,
        status: 500,
        message: 'Failed to fetch sources of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async update(
    id: bigint,
    user_external_id: string,
    data: { name?: string; category_id?: bigint; income?: number }
  ): Promise<ServiceResult<SourceOfIncomeRecord>> {
    if (Object.keys(data).length === 0)
      return { ok: false, status: 400, message: 'No fields to update' }
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      if (data.category_id) {
        const category = await db.sourceOfIncomeCategory.findFirst({
          where: { id: data.category_id, user_id: user.id },
        })
        if (!category)
          return {
            ok: false,
            status: 404,
            message: 'Category not found',
            meta: { category_id: data.category_id.toString() },
          }
      }
      const source_of_income = await db.sourceOfIncome.update({
        where: { id, user_id: user.id },
        data,
      })
      await cacheDelPattern(soiCachePattern(user_external_id))
      return {
        ok: true,
        data: {
          id: source_of_income.id.toString(),
          name: source_of_income.name,
          category_id: source_of_income.category_id.toString(),
          income: source_of_income.income,
          created_at: source_of_income.created_at.toISOString(),
          updated_at: source_of_income.updated_at.toISOString(),
        },
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Source of income not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to update source of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async remove(id: bigint, user_external_id: string): Promise<ServiceResult<{ message: string }>> {
    try {
      const user = await db.user.findUnique({ where: { external_id: user_external_id } })
      if (!user) return { ok: false, status: 404, message: 'User not found' }
      await db.sourceOfIncome.delete({ where: { id, user_id: user.id } })
      await cacheDelPattern(soiCachePattern(user_external_id))
      return { ok: true, data: { message: 'Source of income deleted' } }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Source of income not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to delete source of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },
}
```

- [ ] **Step 4: Update the sources of income list route**

Replace `src/routes/v1/sources_of_income/list.ts` entirely:

```ts
import { SourcesOfIncomeService } from '../../../services/sources_of_income'
import { handleError } from '../../../middleware/error'
import { parsePagination } from '../../../helpers/pagination'

export const listSourcesOfIncome = async ({
  clerk_user_id,
  query,
  set,
}: {
  clerk_user_id: string
  query: { page?: string; limit?: string }
  set: { status?: number | string }
}) => {
  const pagination = parsePagination(query)
  if (!pagination.ok) return handleError(set, 400, pagination.error)
  const result = await SourcesOfIncomeService.listForUser(
    clerk_user_id,
    pagination.page,
    pagination.limit
  )
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
```

- [ ] **Step 5: Run all sources of income tests — verify they all pass**

```bash
bun test src/tests/api/sources_of_income.test.ts
```

Expected: 10 pass, 0 fail

- [ ] **Step 6: Commit**

```bash
git add src/services/sources_of_income.ts src/routes/v1/sources_of_income/list.ts \
  src/tests/api/sources_of_income.test.ts
git commit -m "feat: add pagination to sources of income list endpoint"
```

---

### Task 6: Expenses — Enforce 5000 Limit

**Files:**
- Modify: `src/routes/v1/expenses/list.ts`
- Modify: `src/tests/api/expenses.test.ts`

**Context:** The expenses service already uses `skip`/`take` and returns `pagination`. The only change needed is replacing the inline `Math.min(100, ...)` clamping with `parsePagination` so requests over 5000 get a `400` instead of a silent clamp.

- [ ] **Step 1: Write the failing test**

In `src/tests/api/expenses.test.ts`, add one test inside the `describe('Expenses API', ...)` block:

```ts
it('GET /api/v1/expenses with limit=5001 returns 400', async () => {
  const res = await req('GET', '/api/v1/expenses?limit=5001')
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Run tests — verify the new test fails**

```bash
bun test src/tests/api/expenses.test.ts
```

Expected: 11 pass, 1 fail (the new test)

- [ ] **Step 3: Update the expenses list route**

Replace `src/routes/v1/expenses/list.ts` entirely:

```ts
import { ExpensesService } from '../../../services/expenses'
import { handleError } from '../../../middleware/error'
import { parsePagination } from '../../../helpers/pagination'

export const listExpenses = async ({
  clerk_user_id,
  query,
  set,
}: {
  clerk_user_id: string
  query: { page?: string; limit?: string }
  set: { status?: number | string }
}) => {
  const pagination = parsePagination(query)
  if (!pagination.ok) return handleError(set, 400, pagination.error)
  const result = await ExpensesService.listForUser(clerk_user_id, pagination.page, pagination.limit)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
```

- [ ] **Step 4: Run all expenses tests — verify they all pass**

```bash
bun test src/tests/api/expenses.test.ts
```

Expected: 12 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add src/routes/v1/expenses/list.ts src/tests/api/expenses.test.ts
git commit -m "feat: enforce 5000 limit cap on expenses list via parsePagination"
```

---

### Task 7: Full Test Suite Verification

- [ ] **Step 1: Run all tests**

```bash
bun test
```

Expected: all tests pass, 0 fail

- [ ] **Step 2: If any tests fail, read the failure output and fix**

Common causes:
- A service that imports `cacheDel` from `../middleware/cache` — if you missed updating a service, `cacheDel` still exists so there's no import error, but the cache invalidation won't clear all pages.
- A test that checks the old response shape — search for `json.categories` / `json.payment_methods` / `json.sources_of_income` assertions and verify they match the new shape.
