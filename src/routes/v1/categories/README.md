# Categories Routes

Handles source-of-income category management for authenticated users.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/categories` | Create a category |
| `POST` | `/api/v1/categories/search` | Search categories with optional filters |
| `PATCH` | `/api/v1/categories/:id` | Update a category |
| `DELETE` | `/api/v1/categories/:id` | Delete a category |

## Search endpoint

**Filterable fields:**

| Field | Type |
|-------|------|
| `name` | String |
| `created_at` | DateTime |
| `updated_at` | DateTime |

See `docs/api/search-filters.md` for the full filter syntax.

## Handler contract

Handlers receive `{ clerk_user_id, body, set }` (for search/create) or `{ clerk_user_id, params, body, set }` (for update/delete).
