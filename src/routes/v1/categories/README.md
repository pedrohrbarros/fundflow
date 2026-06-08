# Categories Routes

Handles source-of-income category management for authenticated users.

## Endpoints

| Method   | Path                        | Description                             |
| -------- | --------------------------- | --------------------------------------- |
| `POST`   | `/api/v1/categories`        | Create a category                       |
| `POST`   | `/api/v1/categories/search` | Search categories with optional filters |
| `PATCH`  | `/api/v1/categories/:id`    | Update a category                       |
| `DELETE` | `/api/v1/categories/:id`    | Delete a category                       |

## Search endpoint

`POST /api/v1/categories/search` accepts a JSON body with optional `page`, `limit`, and `filters`.

**Filterable fields:**

| Field        | Type     | Valid operators                                                             |
| ------------ | -------- | --------------------------------------------------------------------------- |
| `name`       | String   | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with` |
| `created_at` | DateTime | `is_equal`, `is_before`, `is_after`, `is_between`                           |
| `updated_at` | DateTime | `is_equal`, `is_before`, `is_after`, `is_between`                           |

## Handler contract

Handlers receive `{ clerk_user_id, body, set }` (for search/create) or `{ clerk_user_id, params, body, set }` (for update/delete).
