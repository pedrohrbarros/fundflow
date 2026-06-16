# Types

Shared TypeScript types and TypeBox schemas used across the application. Organised by domain to mirror the route structure.

## Directory Structure

```
types/
├── categories/         # CategoryRecord, TypeBox create/update body schemas
├── expenses/           # ExpenseRecord, ExpensePaymentMethodRecord, TypeBox schemas
├── payment_methods/    # PaymentMethodRecord, TypeBox schemas
├── sources_of_income/  # SourceOfIncomeRecord, TypeBox schemas
├── users/              # UpdateCountryBody TypeBox schema
├── responses/          # OpenAPI response schemas (plain objects) for Swagger UI
├── search/             # OpenAPI request body schemas for search endpoints
└── routes.ts           # RouteHandler type alias
```

## Conventions

Each domain folder exports:

- A `*Record` type describing the shape returned by services to handlers
- TypeBox (`t.Object`) schemas used as the OpenAPI body schema in route `detail`

```typescript
import type { ExpenseRecord } from '../types/expenses'
import { ExpenseCreateBody } from '../types/expenses'
```

Record types use primitive JS types (numbers, strings, booleans) — no `BigInt`. IDs are `number`.

## Special Folders

### `responses/`

Plain OpenAPI schema objects (not TypeBox) used as `responses` in route `detail`. One schema per response shape (e.g. `CategoryResponse`, `CategorySearchResponse`, `DeletedResponse`).

### `search/`

Plain OpenAPI schema objects describing the request body for search endpoints. Includes `page`, `limit`, and a `filters` field documented as `oneOf` FilterCondition/FilterGroup with field-specific operator enums.

## Current Types

| Domain              | Record type(s)                                                       |
| ------------------- | -------------------------------------------------------------------- |
| `categories`        | `CategoryRecord`                                                     |
| `sources_of_income` | `SourceOfIncomeRecord`, `SourceOfIncomeSearchRecord`                 |
| `payment_methods`   | `PaymentMethodRecord`                                                |
| `expenses`          | `ExpenseRecord`, `ExpenseSearchRecord`, `ExpensePaymentMethodRecord` |
| `users`             | — (record defined in `src/services/users.ts`)                        |

`*SearchRecord` types extend the base record with a `period_amount` field added by the period-scoped search service.
