# Security — Endpoint Hardening

Documentation for the security features applied to all fundflow API endpoints.

---

## CORS

All endpoints enforce CORS via `@elysiajs/cors`. Only origins listed in `ALLOWED_ORIGINS` receive
an `Access-Control-Allow-Origin` response header.

**Environment variable:**

```env
ALLOWED_ORIGINS=["http://localhost:3000"]
```

This is a JSON array of allowed origin strings. Add additional frontend URLs to expand access.

**Allowed request headers:** `Authorization`, `Content-Type`, `X-Api-Key`

**Allowed methods:** `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`

The plugin is applied at the root app level, so it covers every endpoint including webhook routes.

---

## Request Validation (Zod)

Every mutating endpoint (`POST`, `PATCH`) validates its request body at runtime using [Zod](https://zod.dev).
Validation runs before any service logic, so invalid input never reaches the database.

Zod schemas are stored in `src/schemas/`:

| File | Schemas exported |
|------|-----------------|
| `categories.ts` | `CategoryCreateSchema`, `CategoryUpdateSchema` |
| `expenses.ts` | `ExpenseCreateSchema`, `ExpenseUpdateSchema` |
| `payment_methods.ts` | `PaymentMethodCreateSchema`, `PaymentMethodUpdateSchema` |
| `sources_of_income.ts` | `SourceOfIncomeCreateSchema`, `SourceOfIncomeUpdateSchema` |

**On validation failure** the endpoint returns HTTP `400` with field-level errors:

```json
{
  "error": {
    "name": ["String must contain at least 1 character(s)"]
  }
}
```

**Key validation rules by domain:**

- **Categories:** `name` required, min length 1
- **Expenses:** `name` required min 1, `amount` must be positive (> 0), `payment_methods[].partial_amount` must be positive
- **Payment Methods:** `name` required min 1, `bank`/`receiver` optional min 1 or null on update
- **Sources of Income:** `name` required min 1, `category_id` must be integer, `income` must be ≥ 0

---

## Rate Limiting

A global rate limit of **100 requests per IP per minute** is applied at the root app level, covering
every endpoint.

Webhook endpoints have an additional stricter scoped limit of **50 requests per minute** (configured in
`src/constants/api/rules/webhooks.ts`). The effective limit for webhooks is 50/min.

When the limit is exceeded the API returns:

```
HTTP 429 Too Many Requests
```

---

## Logging

All application logs follow the pattern:

```
{datetime} - {LEVEL} - {message}
```

Example output:

```
2026-05-22 10:30:45 - INFO - Incoming request
2026-05-22 10:30:45 - INFO - Request completed {"status":200,"duration":"3ms"}
2026-05-22 10:30:45 - ERROR - Request error {"error":"Unauthorized"}
```

`method` and `url` are intentionally omitted from request lifecycle logs. Error details appear as
inline JSON after the message when present.

In production (`NODE_ENV=production`) Pino emits standard JSON lines instead.

**Loggers** (defined in `src/config/logging.ts`):

| Export | Used by |
|--------|---------|
| `logger` | App startup messages |
| `endpoint_logger` | Request lifecycle hooks in `src/index.ts` |
| `db_logger` | Prisma query/error events |
| `migration_logger` | Migration scripts |
