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

`POST /api/v1/categories/search` accepts a JSON body with optional `page`, `limit`, `filters`, and `sort`.

### Sorting

Pass an optional `sort` object to control result order. Omitting it keeps the default DB order.

```json
{ "sort": { "field": "name", "direction": "asc" } }
```

| Property    | Type              | Default | Description      |
| ----------- | ----------------- | ------- | ---------------- |
| `field`     | String (required) | —       | Field to sort by |
| `direction` | `asc` \| `desc`   | `asc`   | Sort direction   |

Sortable fields: `id`, `name`, `type`, `created_at`, `updated_at`.

**Filterable fields:**

| Field        | Type     | Valid operators                                                             |
| ------------ | -------- | --------------------------------------------------------------------------- |
| `name`       | String   | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with` |
| `created_at` | DateTime | `is_equal`, `is_before`, `is_after`, `is_between`                           |
| `updated_at` | DateTime | `is_equal`, `is_before`, `is_after`, `is_between`                           |

## Handler contract

Handlers receive `{ clerk_user_id, body, set }` (for search/create) or `{ clerk_user_id, params, body, set }` (for update/delete).
