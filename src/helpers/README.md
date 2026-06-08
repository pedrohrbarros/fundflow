# Helpers

Shared utility modules used across routes and services.

## `pagination.ts`

Parses and validates `page` and `limit` query/body parameters.

**Exports:**

- `parsePagination(query)` — returns `PaginationResult` (`{ ok: true, page, limit }` or `{ ok: false, error }`)
- `PAGINATION_DEFAULT_PAGE` = 1
- `PAGINATION_DEFAULT_LIMIT` = 20
- `PAGINATION_MAX_LIMIT` = 5000
- `PAGINATION_MAX_PAGE` = 10000

## `filters.ts`

Validates a recursive AND/OR filter tree and converts it to a Prisma `where` clause.

**Exports:**

- `parseFilterBody(raw, allowlist)` — validates a raw JSON value as a `FilterNode` against the given field allowlist. Returns `FilterResult` (`{ ok: true, node }` or `{ ok: false, error }`).
- `buildWhereClause(node)` — converts a validated `FilterNode` to a Prisma-compatible `where` fragment.
- Types: `FieldType`, `FieldAllowlist`, `FilterOp`, `FilterValue`, `FilterCondition`, `FilterGroup`, `FilterNode`, `FilterResult`

**Usage pattern:**

```ts
const ALLOWED_FIELDS: FieldAllowlist = {
  name: 'string',
  amount: 'float',
  is_paid: 'boolean',
  created_at: 'datetime',
}

const filterResult = parseFilterBody(body.filters, ALLOWED_FIELDS)
if (!filterResult.ok) return handleError(set, 400, filterResult.error)

const where = {
  user_id: user.id,
  ...buildWhereClause(filterResult.node),
}
```
