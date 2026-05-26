# Search Filters Design

## Goal

Replace all four `GET` list endpoints with `POST /search` endpoints that accept an optional recursive AND/OR filter tree in the request body. A single shared filter helper validates the tree and translates it to a Prisma `where` clause; each service defines which fields are filterable.

## Architecture

A new `src/helpers/filters.ts` module owns all filter logic: type definitions, validation (`parseFilterBody`), and Prisma translation (`buildWhereClause`). Each service defines a `ALLOWED_FIELDS` constant mapping field names to their DB type. Routes become `POST /{resource}/search`. Caching is removed from all search services — the key space is unbounded when filters are in play. Documentation lives in `docs/api/search-filters.md` and `README.md` files in every touched folder.

**Tech stack:** Bun · Elysia · Prisma · TypeScript · bun:test

---

## Wire Format

Every search endpoint accepts a JSON body:

```ts
{
  page?: number       // default 1, max 10000
  limit?: number      // default 20, max 5000
  filters?: FilterNode
}
```

A `FilterNode` is either a **condition** or a **group**:

```ts
// Condition — a single field test
type FilterCondition = {
  field: string
  op: FilterOp
  value?: FilterValue   // omitted for is_null / is_not_null
}

// Group — combines child nodes with AND or OR
type FilterGroup = {
  logic: 'AND' | 'OR'
  conditions: FilterNode[]
}

type FilterNode = FilterCondition | FilterGroup
```

Groups nest arbitrarily. `filters` is optional — omitting it returns all records for the user (equivalent to the old GET).

### Examples

**Simple — single condition:**
```json
{
  "page": 1,
  "limit": 20,
  "filters": { "field": "is_paid", "op": "is_equal", "value": true }
}
```

**Flat AND:**
```json
{
  "filters": {
    "logic": "AND",
    "conditions": [
      { "field": "amount", "op": "is_greater_or_equal", "value": 100 },
      { "field": "amount", "op": "is_lower_or_equal",   "value": 500 }
    ]
  }
}
```

**Nested AND + OR:**
```json
{
  "filters": {
    "logic": "AND",
    "conditions": [
      { "field": "amount", "op": "is_between", "value": [100, 500] },
      {
        "logic": "OR",
        "conditions": [
          { "field": "is_paid",  "op": "is_equal", "value": true },
          { "field": "is_saved", "op": "is_equal", "value": true }
        ]
      }
    ]
  }
}
```

---

## Operators per Type

### String

| Op | Prisma equivalent | Value |
|----|-------------------|-------|
| `is_equal` | `{ equals: value }` | `string` |
| `is_not_equal` | `{ not: value }` | `string` |
| `is_contains` | `{ contains: value, mode: 'insensitive' }` | `string` |
| `is_starts_with` | `{ startsWith: value, mode: 'insensitive' }` | `string` |
| `is_ends_with` | `{ endsWith: value, mode: 'insensitive' }` | `string` |

### String (nullable) — all String ops plus:

| Op | Prisma equivalent | Value |
|----|-------------------|-------|
| `is_null` | `null` | _(omit value)_ |
| `is_not_null` | `{ not: null }` | _(omit value)_ |

### Float

| Op | Prisma equivalent | Value |
|----|-------------------|-------|
| `is_equal` | `{ equals: value }` | `number` |
| `is_not_equal` | `{ not: value }` | `number` |
| `is_greater` | `{ gt: value }` | `number` |
| `is_greater_or_equal` | `{ gte: value }` | `number` |
| `is_lower` | `{ lt: value }` | `number` |
| `is_lower_or_equal` | `{ lte: value }` | `number` |
| `is_between` | `{ gte: value[0], lte: value[1] }` | `[number, number]` |

### Boolean

| Op | Prisma equivalent | Value |
|----|-------------------|-------|
| `is_equal` | `{ equals: value }` | `boolean` |

### DateTime

| Op | Prisma equivalent | Value |
|----|-------------------|-------|
| `is_equal` | `{ equals: new Date(value) }` | ISO 8601 string |
| `is_before` | `{ lt: new Date(value) }` | ISO 8601 string |
| `is_after` | `{ gt: new Date(value) }` | ISO 8601 string |
| `is_between` | `{ gte: new Date(value[0]), lte: new Date(value[1]) }` | `[ISO string, ISO string]` |

---

## Filterable Fields per Endpoint

### `POST /api/v1/expenses/search`

| Field | Type |
|-------|------|
| `name` | String |
| `amount` | Float |
| `is_paid` | Boolean |
| `is_saved` | Boolean |
| `saving_location` | String (nullable) |
| `created_at` | DateTime |
| `updated_at` | DateTime |

### `POST /api/v1/payment_methods/search`

| Field | Type |
|-------|------|
| `name` | String |
| `origin` | String |
| `receiver` | String (nullable) |
| `created_at` | DateTime |
| `updated_at` | DateTime |

### `POST /api/v1/categories/search`

| Field | Type |
|-------|------|
| `name` | String |
| `created_at` | DateTime |
| `updated_at` | DateTime |

### `POST /api/v1/sources_of_income/search`

| Field | Type |
|-------|------|
| `name` | String |
| `income` | Float |
| `created_at` | DateTime |
| `updated_at` | DateTime |

---

## Filter Helper — `src/helpers/filters.ts`

### Types

```ts
export type FieldType = 'string' | 'string_nullable' | 'float' | 'boolean' | 'datetime'
export type FieldAllowlist = Record<string, FieldType>

export type FilterOp =
  | 'is_equal' | 'is_not_equal'
  | 'is_contains' | 'is_starts_with' | 'is_ends_with'
  | 'is_null' | 'is_not_null'
  | 'is_greater' | 'is_greater_or_equal'
  | 'is_lower'  | 'is_lower_or_equal'
  | 'is_between'
  | 'is_before' | 'is_after'

export type FilterValue = string | number | boolean | [number, number] | [string, string]

export type FilterCondition = {
  field: string
  op: FilterOp
  value?: FilterValue
}

export type FilterGroup = {
  logic: 'AND' | 'OR'
  conditions: FilterNode[]
}

export type FilterNode = FilterCondition | FilterGroup

type FilterOk = { ok: true; node: FilterNode }
type FilterError = { ok: false; error: string }
export type FilterResult = FilterOk | FilterError
```

### `parseFilterBody(raw, allowlist): FilterResult`

Validates a raw JSON value as a `FilterNode` against the given allowlist:

1. If input has a `logic` key → validate as `FilterGroup`: `logic` must be `'AND'` or `'OR'`, `conditions` must be a non-empty array, recurse into each child
2. Otherwise → validate as `FilterCondition`:
   - `field` must exist in `allowlist`
   - `op` must be valid for the field's type (see ops-per-type table)
   - `value` must match expected shape for the op:
     - `is_null` / `is_not_null`: value must be absent
     - `is_between`: value must be `[a, b]` where `a <= b` and both match the field's scalar type
     - all others: value must be a scalar matching the field's type
3. Returns `{ ok: false, error: '<description>' }` on first validation failure
4. Returns `{ ok: true, node: validatedNode }` on success

### `buildWhereClause(node): object`

Recursively converts a validated `FilterNode` to a Prisma `where` fragment:

- `FilterGroup` with `logic: 'AND'` → `{ AND: conditions.map(buildWhereClause) }`
- `FilterGroup` with `logic: 'OR'`  → `{ OR: conditions.map(buildWhereClause) }`
- `FilterCondition` → `{ [field]: <prisma operator object> }` per the ops-per-type table

The result is spread directly into the Prisma `findMany` `where` clause alongside the `user_id` filter:

```ts
where: {
  user_id: user.id,
  ...buildWhereClause(filters),
}
```

---

## Route Changes

Each `src/routes/v1/{resource}/list.ts` is **deleted** and replaced with `search.ts`:

```ts
// src/routes/v1/expenses/search.ts  (representative example)
export const searchExpenses = async ({ clerk_user_id, body, set }) => {
  const pagination = parsePagination({ page: String(body.page ?? ''), limit: String(body.limit ?? '') })
  if (!pagination.ok) return handleError(set, 400, pagination.error)

  let filters: FilterNode | undefined
  if (body.filters !== undefined) {
    const result = parseFilterBody(body.raw_filters, EXPENSE_ALLOWED_FIELDS)
    if (!result.ok) return handleError(set, 400, result.error)
    filters = result.node
  }

  const result = await ExpensesService.search(clerk_user_id, pagination.page, pagination.limit, filters)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)
  return result.data
}
```

The Elysia router registration changes from `GET /` to `POST /search` in each resource's index file. The body schema (TypeBox) validates `page`, `limit` as optional numbers and `filters` as an optional object (deep validation is handled by `parseFilterBody`, not TypeBox).

---

## Service Changes

Each service's `listForUser(uid, page, limit)` is replaced with `search(uid, page, limit, filters?)`:

```ts
async search(
  user_external_id: string,
  page: number,
  limit: number,
  filters?: FilterNode
): Promise<ServiceResult<ExpenseListData>>
```

The Prisma `findMany` call gains a `where` extension:

```ts
const where = {
  user_id: user.id,
  ...(filters ? buildWhereClause(filters) : {}),
}

const [expenses, total] = await db.$transaction([
  db.expense.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * limit, take: limit, include: { ... } }),
  db.expense.count({ where }),
])
```

**Caching is removed** from all four services. The `cacheGet`, `cacheSet`, `cacheDelPattern` imports and their usages in the list path are deleted. Create/update/delete mutations no longer call `cacheDelPattern`.

### Sources of income special case

Filtering happens at the DB level. After fetching, rows are still grouped by `category.name` in memory before the response is built. `pagination.total` reflects the count of matching `SourceOfIncome` rows, not the number of categories.

---

## Error Handling

All errors return `{ error: string }` with the appropriate status code:

| Condition | Status |
|-----------|--------|
| `page` or `limit` out of range | 400 |
| `logic` not `AND` or `OR` | 400 |
| `field` not in allowlist | 400 |
| `op` not valid for the field's type | 400 |
| `value` missing when required | 400 |
| `value` wrong type for op | 400 |
| `is_between` value not a 2-element array with `a <= b` | 400 |
| DateTime value not a valid ISO 8601 string | 400 |
| User not found | 404 |
| DB error | 500 |

---

## Testing Strategy

### Unit tests — `src/tests/helpers/filters.test.ts`

`parseFilterBody` cases:
- Valid single condition for each field type (string, float, boolean, datetime)
- Valid `is_between` with correct 2-element array
- Valid nested AND + OR group
- Error: unknown field
- Error: op invalid for type (e.g. `is_before` on a float field)
- Error: `is_between` with non-array value
- Error: `is_between` with `a > b`
- Error: `is_null` on non-nullable field
- Error: value missing for op that requires it
- Error: value present for `is_null` / `is_not_null`
- Error: `logic` is neither AND nor OR
- Error: `conditions` is empty array

`buildWhereClause` cases:
- Single condition maps to correct Prisma fragment for each op
- AND group maps to `{ AND: [...] }`
- OR group maps to `{ OR: [...] }`
- Nested group maps recursively

### Integration tests — `src/tests/api/*.test.ts`

All existing tests updated: `req('GET', '/api/v1/expenses?...')` → `req('POST', '/api/v1/expenses/search', { page, limit })`.

New filter tests per endpoint (representative — same pattern for all):
- `POST /api/v1/expenses/search` with `is_equal` filter returns only matching records
- `POST /api/v1/expenses/search` with `is_between` on `amount` returns only in-range records
- `POST /api/v1/expenses/search` with nested AND/OR returns correct subset
- `POST /api/v1/expenses/search` with unknown field returns 400
- `POST /api/v1/expenses/search` with op invalid for field type returns 400

### Cache tests deleted

`src/tests/cache/payment_methods.test.ts`, `categories.test.ts`, `sources_of_income.test.ts` are deleted — there is no longer a cache layer on search responses.

---

## Documentation Artifacts

### `docs/api/search-filters.md`

External API reference for the frontend team. Covers:
- Filter tree shape with full TypeScript types
- All operators with value types and examples
- Per-endpoint field reference table
- Complete request/response examples for each of the four endpoints
- Error response shape and common 400 causes

### `README.md` files

| Path | Action | Content |
|------|--------|---------|
| `src/helpers/README.md` | Create | Documents `pagination.ts` and `filters.ts` — what each export does and when to use it |
| `src/routes/README.md` | Update | Reflect that list routes are now POST /search |
| `src/routes/v1/expenses/README.md` | Create | Documents `search.ts`, allowed fields, and handler contract |
| `src/routes/v1/payment_methods/README.md` | Create | Same pattern |
| `src/routes/v1/categories/README.md` | Create | Same pattern |
| `src/routes/v1/sources_of_income/README.md` | Create | Same pattern, notes category grouping behaviour |
| `src/services/README.md` | Update | Reflect `search()` signature, removal of caching |

---

## File Change Summary

| File | Action |
|------|--------|
| `src/helpers/filters.ts` | **Create** |
| `src/helpers/README.md` | **Create** |
| `src/tests/helpers/filters.test.ts` | **Create** |
| `src/routes/v1/expenses/list.ts` | **Delete** → replaced by `search.ts` |
| `src/routes/v1/expenses/search.ts` | **Create** |
| `src/routes/v1/expenses/README.md` | **Create** |
| `src/routes/v1/payment_methods/list.ts` | **Delete** → replaced by `search.ts` |
| `src/routes/v1/payment_methods/search.ts` | **Create** |
| `src/routes/v1/payment_methods/README.md` | **Create** |
| `src/routes/v1/categories/list.ts` | **Delete** → replaced by `search.ts` |
| `src/routes/v1/categories/search.ts` | **Create** |
| `src/routes/v1/categories/README.md` | **Create** |
| `src/routes/v1/sources_of_income/list.ts` | **Delete** → replaced by `search.ts` |
| `src/routes/v1/sources_of_income/search.ts` | **Create** |
| `src/routes/v1/sources_of_income/README.md` | **Create** |
| `src/routes/README.md` | **Update** |
| `src/services/expenses.ts` | **Update** |
| `src/services/payment_methods.ts` | **Update** |
| `src/services/categories.ts` | **Update** |
| `src/services/sources_of_income.ts` | **Update** |
| `src/services/README.md` | **Update** |
| `src/tests/api/expenses.test.ts` | **Update** |
| `src/tests/api/payment_methods.test.ts` | **Update** |
| `src/tests/api/categories.test.ts` | **Update** |
| `src/tests/api/sources_of_income.test.ts` | **Update** |
| `src/tests/cache/payment_methods.test.ts` | **Delete** |
| `src/tests/cache/categories.test.ts` | **Delete** |
| `src/tests/cache/sources_of_income.test.ts` | **Delete** |
| `docs/api/search-filters.md` | **Create** |
