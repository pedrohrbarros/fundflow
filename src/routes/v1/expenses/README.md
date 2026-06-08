# Expenses Routes

Handles expense management for authenticated users.

## Endpoints

| Method   | Path                      | Description                                          |
| -------- | ------------------------- | ---------------------------------------------------- |
| `POST`   | `/api/v1/expenses`        | Create a new expense                                 |
| `POST`   | `/api/v1/expenses/search` | Search expenses with optional filters and pagination |
| `PATCH`  | `/api/v1/expenses/:id`    | Update an expense                                    |
| `DELETE` | `/api/v1/expenses/:id`    | Delete an expense                                    |

## Search endpoint

`POST /api/v1/expenses/search` accepts a JSON body with optional `page`, `limit`, and `filters`.

**Filterable fields:**

| Field             | Type              | Valid operators                                                                                                |
| ----------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `name`            | String            | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with`                                    |
| `amount`          | Float             | `is_equal`, `is_not_equal`, `is_greater`, `is_greater_or_equal`, `is_lower`, `is_lower_or_equal`, `is_between` |
| `is_paid`         | Boolean           | `is_equal`                                                                                                     |
| `is_saved`        | Boolean           | `is_equal`                                                                                                     |
| `saving_location` | String (nullable) | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with`, `is_null`, `is_not_null`          |
| `created_at`      | DateTime          | `is_equal`, `is_before`, `is_after`, `is_between`                                                              |
| `updated_at`      | DateTime          | `is_equal`, `is_before`, `is_after`, `is_between`                                                              |

## Handler contract

Handlers receive `{ clerk_user_id, body, set }` (for search/create) or `{ clerk_user_id, params, body, set }` (for update/delete). They return data directly on success or call `handleError(set, status, message)` on failure.
