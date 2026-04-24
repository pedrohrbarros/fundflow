# Routes

All routes are versioned under `/v1` and registered in `src/index.ts` via Elysia's `.group()`.

## Directory Structure

```
routes/
└── v1/
    ├── webhooks.ts              # Elysia plugin that mounts all webhook routes
    └── webhooks/
        └── clerk/
            └── user-created.ts  # Handler for Clerk user.created webhook
```

## Conventions

### File layout

Each route group has two parts:

- **`<resource>.ts`** — the Elysia plugin that declares the route paths and wires handlers together.
- **`<resource>/<provider>/<event>.ts`** — the handler function for a specific event, exported as a named `const`.

### Naming

| What | Pattern | Example |
|------|---------|---------|
| Plugin file | `<resource>.ts` | `webhooks.ts` |
| Handler file | `<provider>/<event>.ts` | `clerk/user-created.ts` |
| Handler export | `<provider><Event>Handler` (camelCase) | `clerkUserCreatedListenerWebhook` |

### Route paths

Routes follow the shape:

```
/<resource>/<provider>/<event>/listener
```

Example: `POST /webhooks/clerk/user-created/listener`

### Adding a new endpoint

1. Create the handler in `routes/v1/<resource>/<provider>/<event>.ts`.
2. Import and register it in `routes/v1/<resource>.ts`.
3. Add the corresponding request/response types under `src/types/<resource>/<provider>/`.

## Current Endpoints

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/webhooks/clerk/user-created/listener` | Creates a user record from a Clerk `user.created` event |
