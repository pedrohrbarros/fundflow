# Payment Methods Routes

Handles payment method management for authenticated users.

## Endpoints

| Method   | Path                             | Description                                  |
| -------- | -------------------------------- | -------------------------------------------- |
| `POST`   | `/api/v1/payment_methods`        | Create a payment method                      |
| `POST`   | `/api/v1/payment_methods/search` | Search payment methods with optional filters |
| `PATCH`  | `/api/v1/payment_methods/:id`    | Update a payment method                      |
| `DELETE` | `/api/v1/payment_methods/:id`    | Delete a payment method                      |

## Search endpoint

`POST /api/v1/payment_methods/search` accepts a JSON body with optional `page`, `limit`, and `filters`.

**Filterable fields:**

| Field        | Type              | Valid operators                                                                                       |
| ------------ | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `name`       | String            | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with`                           |
| `origin`     | String            | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with`                           |
| `receiver`   | String (nullable) | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with`, `is_null`, `is_not_null` |
| `created_at` | DateTime          | `is_equal`, `is_before`, `is_after`, `is_between`                                                     |
| `updated_at` | DateTime          | `is_equal`, `is_before`, `is_after`, `is_between`                                                     |

## Handler contract

Handlers receive `{ clerk_user_id, body, set }` (for search/create) or `{ clerk_user_id, params, body, set }` (for update/delete).
