# Payment Methods Routes

Handles payment method management for authenticated users.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/payment_methods` | Create a payment method |
| `POST` | `/api/v1/payment_methods/search` | Search payment methods with optional filters |
| `PATCH` | `/api/v1/payment_methods/:id` | Update a payment method |
| `DELETE` | `/api/v1/payment_methods/:id` | Delete a payment method |

## Search endpoint

**Filterable fields:**

| Field | Type |
|-------|------|
| `name` | String |
| `origin` | String |
| `receiver` | String (nullable) |
| `created_at` | DateTime |
| `updated_at` | DateTime |

See `docs/api/search-filters.md` for the full filter syntax.

## Handler contract

Handlers receive `{ clerk_user_id, body, set }` (for search/create) or `{ clerk_user_id, params, body, set }` (for update/delete).
