# Types

Shared TypeScript types used across the application, organised to mirror the route and domain structure.

## Directory Structure

```
types/
└── webhooks/
    └── clerk/
        └── index.ts   # Payload types for Clerk webhook events
```

## Conventions

### File layout

Types are grouped by **domain** then **provider**, mirroring `src/routes/v1/`:

```
types/<domain>/<provider>/index.ts
```

Each `index.ts` exports all types for that provider so consumers import from the directory:

```ts
import type { ClerkUserCreatedPayload } from '../../types/webhooks/clerk'
```

### Naming

| What | Pattern | Example |
|------|---------|---------|
| Payload type | `<Provider><Event>Payload` | `ClerkUserCreatedPayload` |
| Response type | `<Provider><Event>Response` | `ClerkUserCreatedResponse` |

### Adding new types

1. Create `types/<domain>/<provider>/index.ts` (or add to an existing one).
2. Export every type from that file.
3. Keep types focused on the shape of external payloads and internal responses — avoid business-logic in type files.

## Current Types

### `webhooks/clerk`

| Type | Description |
|------|-------------|
| `ClerkUserCreatedPayload` | Shape of the `user.created` webhook body sent by Clerk |
