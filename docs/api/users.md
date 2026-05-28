# Users API Reference

## Overview

The Users API allows the authenticated user to fetch their own profile and update their home country.

**Auth required:** Clerk JWT (`Authorization: Bearer <jwt>`) + `X-Api-Key: <token>`

---

## Endpoints

### `GET /api/v1/users/me`

Returns the authenticated user's profile.

#### Response (200)

```json
{
  "id": "123",
  "country": "BR",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Internal user ID |
| `country` | `string` | ISO alpha-2 country code (e.g. `"BR"`, `"US"`) |
| `created_at` | `string` | ISO 8601 timestamp |
| `updated_at` | `string` | ISO 8601 timestamp |

---

### `PATCH /api/v1/users/country`

Updates the authenticated user's home country.

#### Request Body

```json
{ "country": "US" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `country` | `string` | Yes | ISO alpha-2 country code (exactly 2 characters, e.g. `"BR"`, `"US"`, `"GB"`) |

#### Response (200)

Same shape as `GET /api/v1/users/me`.

#### Error Responses

| Status | When |
|--------|------|
| `400` | Missing body, `country` not exactly 2 characters |
| `401` | Missing or invalid Clerk JWT / X-Api-Key |
| `404` | Authenticated user not in the database |
| `500` | Unexpected database error |

---

## Notes

- The `country` field is stored as an ISO 3166-1 alpha-2 code (two uppercase letters).
- Default country for new users is `"BR"` (Brazil).
- This field is used by the frontend to determine the user's home currency for income conversion.
