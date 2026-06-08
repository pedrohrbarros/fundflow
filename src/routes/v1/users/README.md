# Users Routes

Exposes the authenticated user's own record.

## Endpoints

| Method  | Path                    | Description                       |
| ------- | ----------------------- | --------------------------------- |
| `GET`   | `/api/v1/users/me`      | Get the authenticated user        |
| `PATCH` | `/api/v1/users/country` | Update the user's country (ISO 2) |

## Response shape

Both endpoints return a `UserRecord`:

```json
{
  "id": 1,
  "country": "US",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

## Handler contract

Handlers receive `{ clerk_user_id, set }` (GET) or `{ clerk_user_id, body, set }` (PATCH). The `clerk_user_id` is the Clerk JWT `sub` claim injected by `withUserAuth`.

> These routes are excluded from the Swagger UI (`detail: { hide: true }`).
