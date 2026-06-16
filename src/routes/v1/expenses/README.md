# Expenses Routes

Handles expense management for authenticated users.

## Endpoints

| Method   | Path                           | Description                                        |
| -------- | ------------------------------ | -------------------------------------------------- |
| `POST`   | `/api/v1/expenses`             | Create a new expense                               |
| `POST`   | `/api/v1/expenses/search`      | Search expenses with period scoping and pagination |
| `POST`   | `/api/v1/expenses/by-category` | Summarise period expenses grouped by category      |
| `PATCH`  | `/api/v1/expenses/:id`         | Update an expense                                  |
| `DELETE` | `/api/v1/expenses/:id`         | Delete an expense                                  |

## Create / Update fields

| Field             | Required on create | Description                                             |
| ----------------- | ------------------ | ------------------------------------------------------- |
| `name`            | Yes                | Expense name                                            |
| `category_id`     | Yes                | ID of an EXPENSE-type category owned by the user        |
| `amount`          | Yes                | Positive number                                         |
| `date`            | Yes                | Anchor date in `YYYY-MM-DD` format                      |
| `is_recurring`    | No (default false) | When true the expense recurs monthly on the `date` day  |
| `is_paid`         | No (default false) |                                                         |
| `is_saved`        | No (default false) |                                                         |
| `saving_location` | No                 | Nullable string                                         |
| `payment_methods` | No                 | Array of `{ payment_method_id, partial_amount }` splits |

## Search endpoint

`POST /api/v1/expenses/search` accepts a JSON body with optional `page`, `limit`, `granularity`, `date`, and `filters`.

### Period scoping

| Field         | Type                               | Default   | Description                                          |
| ------------- | ---------------------------------- | --------- | ---------------------------------------------------- |
| `granularity` | `daily` \| `monthly` \| `annually` | `monthly` | Window size for the period                           |
| `date`        | String (`YYYY-MM-DD`)              | today     | Anchor date — determines which period window is used |

When omitted, the endpoint returns expenses applicable in the current calendar month.

### Response shape

```json
{
  "expenses": [
    {
      "id": 1,
      "name": "Rent",
      "category_id": 3,
      "amount": 1200,
      "date": "2026-01-01",
      "is_recurring": true,
      "period_amount": 1200,
      "is_paid": true,
      "is_saved": false,
      "saving_location": null,
      "payment_methods": [],
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 1200,
  "pagination": { "page": 1, "limit": 20, "total": 1 }
}
```

- `period_amount` — the amount attributed to the requested period (equals `amount` for one-off expenses; prorated for recurrences).
- `total` — sum of `period_amount` across all applicable expenses (before pagination).
- `pagination.total` — count of applicable expenses in the period (not total DB rows).

### Filterable fields

| Field             | Type              | Valid operators                                                                                                |
| ----------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `name`            | String            | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with`                                    |
| `amount`          | Float             | `is_equal`, `is_not_equal`, `is_greater`, `is_greater_or_equal`, `is_lower`, `is_lower_or_equal`, `is_between` |
| `is_paid`         | Boolean           | `is_equal`                                                                                                     |
| `is_saved`        | Boolean           | `is_equal`                                                                                                     |
| `saving_location` | String (nullable) | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with`, `is_null`, `is_not_null`          |
| `created_at`      | DateTime          | `is_equal`, `is_before`, `is_after`, `is_between`                                                              |
| `updated_at`      | DateTime          | `is_equal`, `is_before`, `is_after`, `is_between`                                                              |

## By-category endpoint

`POST /api/v1/expenses/by-category` accepts the same `granularity`, `date`, and `filters` fields as the search endpoint (no pagination). It returns expenses summed per category for the requested period.

### Response shape

```json
{
  "by_category": [{ "category_id": 3, "name": "Housing", "total": 1200, "count": 1 }],
  "total": 1200
}
```

- `by_category[].total` — period sum for that category.
- `total` — sum across all categories for the period.

## Recurrence rules

- An expense with `is_recurring: true` recurs monthly on the day specified in `date`.
- Recurrence is indefinite — it applies to every month from `date` onwards.
- If the anchor day exceeds the length of the target month (e.g. day 31 in February), it is clamped to the last day of that month.

## Handler contract

Handlers receive `{ user_external_id, body, set }` (for search/create) or `{ user_external_id, params, body, set }` (for update/delete). They return data directly on success or call `handleError(set, status, message)` on failure.
