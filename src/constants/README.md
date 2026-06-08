# Constants

Static configuration values that don't belong in environment variables — rate limits, IP allowlists, and validation rules that are fixed at deploy time.

## Files

### `api/rules/webhooks.ts`

Rate limiting rules for all `/api/v1/webhooks/*` routes: 50 requests per minute per IP.

### `webhooks/rules/clerk.ts`

Clerk webhook security rules:

- **IP allowlist** — the list of CIDR ranges published by Clerk. Requests from outside these ranges are rejected with `403` before the handler runs.
- **Svix signature header names** — used when verifying the Svix webhook signature.

The allowlist is checked by the webhook middleware using the CIDR utilities in `src/helpers/network/cidr.ts`.
