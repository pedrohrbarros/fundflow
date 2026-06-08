# Sources of Income Routes

Handles source-of-income management for authenticated users.

## Endpoints

| Method   | Path                               | Description                          |
| -------- | ---------------------------------- | ------------------------------------ |
| `POST`   | `/api/v1/sources_of_income`        | Create a source of income            |
| `POST`   | `/api/v1/sources_of_income/search` | Search sources with optional filters |
| `PATCH`  | `/api/v1/sources_of_income/:id`    | Update a source of income            |
| `DELETE` | `/api/v1/sources_of_income/:id`    | Delete a source of income            |

## Search endpoint

`POST /api/v1/sources_of_income/search` accepts a JSON body with optional `page`, `limit`, and `filters`.

**Filterable fields:**

| Field        | Type     | Valid operators                                                                                                |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| `name`       | String   | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with`                                    |
| `income`     | Float    | `is_equal`, `is_not_equal`, `is_greater`, `is_greater_or_equal`, `is_lower`, `is_lower_or_equal`, `is_between` |
| `currency`   | String   | `is_equal`, `is_not_equal`, `is_contains`, `is_starts_with`, `is_ends_with`                                    |
| `created_at` | DateTime | `is_equal`, `is_before`, `is_after`, `is_between`                                                              |
| `updated_at` | DateTime | `is_equal`, `is_before`, `is_after`, `is_between`                                                              |

**Response shape:** Results are grouped by category name:

```json
{
  "sources_of_income": {
    "Salary": [
      {
        "id": 1,
        "name": "Job",
        "income": 5000,
        "currency": "USD",
        "category_id": 1,
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "Freelance": [
      {
        "id": 2,
        "name": "Consulting",
        "income": 1000,
        "currency": "EUR",
        "category_id": 2,
        "created_at": "...",
        "updated_at": "..."
      }
    ]
  },
  "pagination": { "page": 1, "limit": 20, "total": 2 }
}
```

`pagination.total` is the count of matching sources, not the number of categories.
