# Sources of Income Routes

Handles source-of-income management for authenticated users.

## Endpoints

| Method   | Path                               | Description                                    |
| -------- | ---------------------------------- | ---------------------------------------------- |
| `POST`   | `/api/v1/sources_of_income`        | Create a source of income                      |
| `POST`   | `/api/v1/sources_of_income/search` | Search sources with period scoping and filters |
| `PATCH`  | `/api/v1/sources_of_income/:id`    | Update a source of income                      |
| `DELETE` | `/api/v1/sources_of_income/:id`    | Delete a source of income                      |

## Create / Update fields

| Field          | Required on create | Description                                                                                   |
| -------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| `name`         | Yes                | Source name                                                                                   |
| `category_id`  | No (nullable)      | ID of an INCOME-type category owned by the user; omit or set to `null` to leave uncategorized |
| `income`       | No (default 0)     | Base income amount (non-negative)                                                             |
| `currency`     | No (default "USD") | 3-letter ISO 4217 currency code (uppercase)                                                   |
| `date`         | Yes                | Anchor date in `YYYY-MM-DD` format                                                            |
| `is_recurring` | No (default false) | When true the income recurs monthly on the `date` day                                         |

## Search endpoint

`POST /api/v1/sources_of_income/search` accepts a JSON body with optional `page`, `limit`, `granularity`, `date`, and `filters`.

### Period scoping

| Field         | Type                               | Default   | Description                                          |
| ------------- | ---------------------------------- | --------- | ---------------------------------------------------- |
| `granularity` | `daily` \| `monthly` \| `annually` | `monthly` | Window size for the period                           |
| `date`        | String (`YYYY-MM-DD`)              | today     | Anchor date — determines which period window is used |

When omitted, the endpoint returns sources applicable in the current calendar month.

### Response shape

Results are returned as an array of category groups. Each group has a `category_id`, a `category_name`, and a `sources` array. Each source record includes a `period_amount` field. A per-currency `total` is included at the top level. Sources without a `category_id` appear in the group where `category_id` is `null` (and `category_name` is `null`).

```json
{
  "sources_of_income": [
    {
      "category_id": 1,
      "category_name": "Salary",
      "sources": [
        {
          "id": 1,
          "name": "Job",
          "income": 5000,
          "currency": "USD",
          "date": "2026-01-01",
          "is_recurring": true,
          "period_amount": 5000,
          "category_id": 1,
          "created_at": "...",
          "updated_at": "..."
        }
      ]
    },
    {
      "category_id": 2,
      "category_name": "Freelance",
      "sources": [
        {
          "id": 2,
          "name": "Consulting",
          "income": 1000,
          "currency": "EUR",
          "date": "2026-03-15",
          "is_recurring": false,
          "period_amount": 1000,
          "category_id": 2,
          "created_at": "...",
          "updated_at": "..."
        }
      ]
    },
    {
      "category_id": null,
      "category_name": null,
      "sources": [
        {
          "id": 3,
          "name": "Side project",
          "income": 500,
          "currency": "USD",
          "date": "2026-05-10",
          "is_recurring": false,
          "period_amount": 500,
          "category_id": null,
          "created_at": "...",
          "updated_at": "..."
        }
      ]
    }
  ],
  "total": { "USD": 5500, "EUR": 1000 },
  "pagination": { "page": 1, "limit": 20, "total": 3 }
}
```

- `sources_of_income` — array of groups, one per distinct category. Groups are ordered by first appearance in the paged results. The group with `category_id: null` contains uncategorized sources.
- `period_amount` — the amount attributed to the requested period.
- `total` — per-currency sum of `period_amount` across all applicable sources (before pagination).
- `pagination.total` — count of applicable sources in the period.

### Filterable fields

| Field        | Type     | Valid operators                                                                                                |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| `name`       | String   | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with`                                    |
| `income`     | Float    | `is_equal`, `is_not_equal`, `is_greater`, `is_greater_or_equal`, `is_lower`, `is_lower_or_equal`, `is_between` |
| `currency`   | String   | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with`                                    |
| `created_at` | DateTime | `is_equal`, `is_before`, `is_after`, `is_between`                                                              |
| `updated_at` | DateTime | `is_equal`, `is_before`, `is_after`, `is_between`                                                              |

## Recurrence rules

- A source with `is_recurring: true` recurs monthly on the day specified in `date`.
- Recurrence is indefinite — it applies to every month from `date` onwards.
- If the anchor day exceeds the length of the target month (e.g. day 31 in February), it is clamped to the last day of that month.
