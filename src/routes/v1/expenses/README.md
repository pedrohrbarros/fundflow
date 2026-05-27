# Expenses Routes

Handles expense management for authenticated users.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/expenses` | Create a new expense |
| `POST` | `/api/v1/expenses/search` | Search expenses with optional filters and pagination |
| `PATCH` | `/api/v1/expenses/:id` | Update an expense |
| `DELETE` | `/api/v1/expenses/:id` | Delete an expense |

## Search endpoint

`POST /api/v1/expenses/search` accepts a JSON body with optional `page`, `limit`, and `filters`.

**Filterable fields:**

| Field | Type |
|-------|------|
| `name` | String |
| `amount` | Float |
| `is_paid` | Boolean |
| `is_saved` | Boolean |
| `saving_location` | String (nullable) |
| `created_at` | DateTime |
| `updated_at` | DateTime |

See `docs/api/search-filters.md` for the full filter syntax.

## Handler contract

Handlers receive `{ clerk_user_id, body, set }` (for search/create) or `{ clerk_user_id, params, body, set }` (for update/delete). They return data directly on success or call `handleError(set, status, message)` on failure.
