# Sources of Income Routes

Handles source-of-income management for authenticated users.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/sources_of_income` | Create a source of income |
| `POST` | `/api/v1/sources_of_income/search` | Search sources with optional filters |
| `PATCH` | `/api/v1/sources_of_income/:id` | Update a source of income |
| `DELETE` | `/api/v1/sources_of_income/:id` | Delete a source of income |

## Search endpoint

**Filterable fields:**

| Field | Type |
|-------|------|
| `name` | String |
| `income` | Float |
| `created_at` | DateTime |
| `updated_at` | DateTime |

**Response shape:** Results are grouped by category name:
```json
{
  "sources_of_income": {
    "Salary": [{ "id": "1", "name": "Job", "income": 5000, "..." : "..." }],
    "Freelance": [{ "id": "2", "name": "Consulting", "income": 1000, "...": "..." }]
  },
  "pagination": { "page": 1, "limit": 20, "total": 2 }
}
```
`pagination.total` is the count of matching sources, not the number of categories.

See `docs/api/search-filters.md` for the full filter syntax.
