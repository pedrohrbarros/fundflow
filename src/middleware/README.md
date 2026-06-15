# Middleware

Elysia middleware applied at the `.group()` level in `src/index.ts`. Each export is a function that takes an Elysia app instance and returns it with hooks applied.

## Files

### `auth.ts`

Exports three middleware functions:

**`withUserAuth`** — dual-mode middleware used on all user-facing routes:

- **Docs mode** (when `X-Docs-Mode: true` is present): validates `X-Api-Key`, then finds or creates the monthly test user (`docs-test-user-YYYY-MM`) and injects its `external_id` as `user_external_id`. This allows Swagger UI to call protected endpoints without a real Google session.
- **Normal mode**: verifies the backend access JWT from `Authorization: Bearer <token>` (HS256, signed with `JWT_SECRET`). Injects the `external_id` claim as `user_external_id`.

In both modes, if auth fails the request is rejected with `401 Unauthorized`.

### `cache.ts`

Cache middleware backed by Redis. Wraps responses for eligible endpoints.

### `error.ts`

Exports `handleError(set, status, message, meta?)` — a helper that sets `set.status` and returns a consistent error body `{ error: message }`. Used by every route handler to avoid duplicating HTTP error logic.
