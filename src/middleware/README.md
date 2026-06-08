# Middleware

Elysia middleware applied at the `.group()` level in `src/index.ts`. Each export is a function that takes an Elysia app instance and returns it with hooks applied.

## Files

### `auth.ts`

Exports three middleware functions:

**`withBearerAuth`** — validates `Authorization: Bearer <API_TOKEN>`. Used on webhook routes.

**`withUserAuth`** — dual-mode middleware used on all user-facing routes:

- **Docs mode** (when `X-Docs-Mode: true` is present): validates `X-Api-Key`, then finds or creates the monthly test user (`docs-test-user-YYYY-MM`) and injects its `external_id` as `clerk_user_id`. This allows Swagger UI to call protected endpoints without a real Clerk session.
- **Normal mode**: verifies the Clerk JWT from `Authorization: Bearer <token>`, checks the `azp` claim, and also validates `X-Api-Key`. Injects the JWT `sub` claim as `clerk_user_id`.

In both modes, if auth fails the request is rejected with `401 Unauthorized`.

### `cache.ts`

Cache middleware backed by Redis. Wraps responses for eligible endpoints.

### `error.ts`

Exports `handleError(set, status, message, meta?)` — a helper that sets `set.status` and returns a consistent error body `{ error: message }`. Used by every route handler to avoid duplicating HTTP error logic.
