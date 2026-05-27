# Search Filters API Reference

## Overview

All four list endpoints have been replaced by `POST /search` endpoints. Every endpoint accepts an optional recursive AND/OR filter tree in the JSON body alongside pagination parameters.

Rather than a single `GET /<resource>` call that returns everything, callers now `POST /<resource>/search` with an optional `filters` tree. This lets the frontend express arbitrarily complex conditions without building query-string DSLs.

---

## Request Body Shape

```ts
{
  page?: number    // default: 1, max: 10000
  limit?: number   // default: 20, max: 5000
  filters?: FilterNode
}
```

A `FilterNode` is either a **condition** or a **group**:

```ts
// Condition — tests a single field
{ field: string, op: FilterOp, value?: FilterValue }

// Group — combines multiple nodes with AND or OR logic
{ logic: "AND" | "OR", conditions: FilterNode[] }
```

Groups can be nested to arbitrary depth. An empty `conditions` array is valid (it matches everything).

---

## Operators per Type

### `string` fields

| Operator | Description | `value` shape |
|----------|-------------|---------------|
| `eq` | Exact match (case-sensitive) | `string` |
| `neq` | Not equal | `string` |
| `contains` | Substring match (case-insensitive) | `string` |
| `starts_with` | Prefix match (case-insensitive) | `string` |
| `ends_with` | Suffix match (case-insensitive) | `string` |

### `string_nullable` fields

Accepts all five `string` operators above, plus:

| Operator | Description | `value` shape |
|----------|-------------|---------------|
| `is_null` | Field is `NULL` | *(omit `value`)* |
| `is_not_null` | Field is not `NULL` | *(omit `value`)* |

### `float` fields

| Operator | Description | `value` shape |
|----------|-------------|---------------|
| `eq` | Equal | `number` |
| `neq` | Not equal | `number` |
| `gt` | Greater than | `number` |
| `gte` | Greater than or equal | `number` |
| `lt` | Less than | `number` |
| `lte` | Less than or equal | `number` |

### `boolean` fields

| Operator | Description | `value` shape |
|----------|-------------|---------------|
| `eq` | Equal | `boolean` |

### `datetime` fields

| Operator | Description | `value` shape |
|----------|-------------|---------------|
| `eq` | Equal | ISO 8601 string, e.g. `"2024-01-15T00:00:00.000Z"` |
| `neq` | Not equal | ISO 8601 string |
| `gt` | After | ISO 8601 string |
| `gte` | On or after | ISO 8601 string |
| `lt` | Before | ISO 8601 string |
| `lte` | On or before | ISO 8601 string |

---

## Endpoints

### 1. `POST /api/v1/expenses/search`

Search expenses belonging to the authenticated user.

**Auth required:** Clerk JWT (`Authorization: Bearer <jwt>`) + `X-Api-Key: <token>`

#### Filterable Fields

| Field | Type |
|-------|------|
| `name` | `string` |
| `amount` | `float` |
| `is_paid` | `boolean` |
| `is_saved` | `boolean` |
| `saving_location` | `string_nullable` |
| `created_at` | `datetime` |
| `updated_at` | `datetime` |

#### Request Example

```http
POST /api/v1/expenses/search
Authorization: Bearer <clerk_jwt>
X-Api-Key: <api_token>
Content-Type: application/json

{
  "page": 1,
  "limit": 20,
  "filters": {
    "logic": "AND",
    "conditions": [
      { "field": "is_paid", "op": "eq", "value": false },
      { "field": "amount", "op": "gte", "value": 100 }
    ]
  }
}
```

#### Response Example

```json
{
  "expenses": [
    {
      "id": "clx1abc000001",
      "user_id": "clx0user00001",
      "name": "Office supplies",
      "amount": 150.00,
      "is_paid": false,
      "is_saved": false,
      "saving_location": null,
      "created_at": "2024-03-10T14:22:00.000Z",
      "updated_at": "2024-03-10T14:22:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

### 2. `POST /api/v1/payment_methods/search`

Search payment methods belonging to the authenticated user.

**Auth required:** Clerk JWT (`Authorization: Bearer <jwt>`) + `X-Api-Key: <token>`

#### Filterable Fields

| Field | Type |
|-------|------|
| `name` | `string` |
| `origin` | `string` |
| `receiver` | `string_nullable` |
| `created_at` | `datetime` |
| `updated_at` | `datetime` |

#### Request Example

```http
POST /api/v1/payment_methods/search
Authorization: Bearer <clerk_jwt>
X-Api-Key: <api_token>
Content-Type: application/json

{
  "page": 1,
  "limit": 10,
  "filters": {
    "field": "name",
    "op": "contains",
    "value": "card"
  }
}
```

#### Response Example

```json
{
  "payment_methods": [
    {
      "id": "clx2pm0000001",
      "user_id": "clx0user00001",
      "name": "Visa card",
      "origin": "Bank of Example",
      "receiver": null,
      "created_at": "2024-01-05T09:00:00.000Z",
      "updated_at": "2024-01-05T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

---

### 3. `POST /api/v1/categories/search`

Search source-of-income categories belonging to the authenticated user.

**Auth required:** Clerk JWT (`Authorization: Bearer <jwt>`) + `X-Api-Key: <token>`

#### Filterable Fields

| Field | Type |
|-------|------|
| `name` | `string` |
| `created_at` | `datetime` |
| `updated_at` | `datetime` |

#### Request Example

```http
POST /api/v1/categories/search
Authorization: Bearer <clerk_jwt>
X-Api-Key: <api_token>
Content-Type: application/json

{
  "page": 1,
  "limit": 50,
  "filters": {
    "field": "created_at",
    "op": "gte",
    "value": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Response Example

```json
{
  "categories": [
    {
      "id": "clx3cat000001",
      "user_id": "clx0user00001",
      "name": "Salary",
      "created_at": "2024-02-01T08:00:00.000Z",
      "updated_at": "2024-02-01T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1
  }
}
```

---

### 4. `POST /api/v1/sources_of_income/search`

Search sources of income belonging to the authenticated user.

**Auth required:** Clerk JWT (`Authorization: Bearer <jwt>`) + `X-Api-Key: <token>`

#### Filterable Fields

| Field | Type |
|-------|------|
| `name` | `string` |
| `income` | `float` |
| `created_at` | `datetime` |
| `updated_at` | `datetime` |

#### Request Example

```http
POST /api/v1/sources_of_income/search
Authorization: Bearer <clerk_jwt>
X-Api-Key: <api_token>
Content-Type: application/json

{
  "page": 1,
  "limit": 20,
  "filters": {
    "field": "income",
    "op": "gt",
    "value": 1000
  }
}
```

#### Response Example

```json
{
  "sources_of_income": {
    "Salary": [
      {
        "id": "clx4src000001",
        "user_id": "clx0user00001",
        "name": "Main job",
        "income": 5000.00,
        "category_id": "clx3cat000001",
        "created_at": "2024-02-01T08:00:00.000Z",
        "updated_at": "2024-02-01T08:00:00.000Z"
      }
    ],
    "Freelance": [
      {
        "id": "clx4src000002",
        "user_id": "clx0user00001",
        "name": "Consulting",
        "income": 1500.00,
        "category_id": "clx3cat000002",
        "created_at": "2024-02-15T10:00:00.000Z",
        "updated_at": "2024-02-15T10:00:00.000Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2
  }
}
```

> **Note:** Results are grouped by category name. `pagination.total` is the count of matching sources, not the number of categories.

---

## Error Responses

All errors return a JSON body of the form:

```json
{ "error": "Human-readable description of the problem" }
```

| Status | When it occurs |
|--------|----------------|
| `400` | Pagination out of range (`page` > 10000 or `limit` > 5000), unknown field name in a condition, invalid operator for the field's type, wrong value type for the operator (e.g. string where number expected), malformed `FilterNode` structure |
| `401` | Missing or invalid Clerk JWT, missing or invalid `X-Api-Key` header |
| `404` | Authenticated user not found in the database |
| `500` | Unexpected database error |

---

## Examples

### Example 1 — Simple search with pagination only

No filters; just fetch the second page of expenses.

```http
POST /api/v1/expenses/search
Authorization: Bearer <clerk_jwt>
X-Api-Key: <api_token>
Content-Type: application/json

{
  "page": 2,
  "limit": 20
}
```

```json
{
  "expenses": [ /* ... */ ],
  "pagination": { "page": 2, "limit": 20, "total": 45 }
}
```

---

### Example 2 — Single condition filter

Find payment methods whose `origin` starts with `"Chase"`.

```http
POST /api/v1/payment_methods/search
Authorization: Bearer <clerk_jwt>
X-Api-Key: <api_token>
Content-Type: application/json

{
  "filters": {
    "field": "origin",
    "op": "starts_with",
    "value": "Chase"
  }
}
```

```json
{
  "payment_methods": [
    {
      "id": "clx2pm0000007",
      "user_id": "clx0user00001",
      "name": "Chase Sapphire",
      "origin": "Chase Bank",
      "receiver": null,
      "created_at": "2024-06-01T12:00:00.000Z",
      "updated_at": "2024-06-01T12:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1 }
}
```

---

### Example 3 — Nested AND + OR group

Find unpaid expenses that are either large (≥ 500) or saved to a specific location.

```http
POST /api/v1/expenses/search
Authorization: Bearer <clerk_jwt>
X-Api-Key: <api_token>
Content-Type: application/json

{
  "page": 1,
  "limit": 50,
  "filters": {
    "logic": "AND",
    "conditions": [
      { "field": "is_paid", "op": "eq", "value": false },
      {
        "logic": "OR",
        "conditions": [
          { "field": "amount", "op": "gte", "value": 500 },
          { "field": "saving_location", "op": "eq", "value": "Emergency fund" }
        ]
      }
    ]
  }
}
```

```json
{
  "expenses": [
    {
      "id": "clx1abc000042",
      "user_id": "clx0user00001",
      "name": "New laptop",
      "amount": 1200.00,
      "is_paid": false,
      "is_saved": true,
      "saving_location": "Tech fund",
      "created_at": "2024-04-20T11:00:00.000Z",
      "updated_at": "2024-04-20T11:00:00.000Z"
    },
    {
      "id": "clx1abc000091",
      "user_id": "clx0user00001",
      "name": "Car repair",
      "amount": 300.00,
      "is_paid": false,
      "is_saved": true,
      "saving_location": "Emergency fund",
      "created_at": "2024-05-01T09:30:00.000Z",
      "updated_at": "2024-05-01T09:30:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 2 }
}
```
