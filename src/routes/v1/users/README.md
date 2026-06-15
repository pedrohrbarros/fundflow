# Users Routes

Exposes the authenticated user's own record.

## Endpoints

| Method   | Path               | Description                       |
| -------- | ------------------ | --------------------------------- |
| `GET`    | `/api/v1/users/me` | Get the authenticated user        |
| `PATCH`  | `/api/v1/users/me` | Update the user's country (ISO 2) |
| `DELETE` | `/api/v1/users/me` | Delete the user's account         |

## Response shape

`GET` and `PATCH` return a `UserRecord`:

```json
{
  "id": 1,
  "country": "US",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

## Handler contract

Handlers receive `{ user_external_id, set }` (GET/DELETE) or `{ user_external_id, body, set }` (PATCH). The `user_external_id` is the JWT `external_id` claim injected by `withUserAuth`.

> These routes are excluded from the Swagger UI (`detail: { hide: true }`).
