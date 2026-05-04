# Routes

All routes are versioned under `/v1` and registered in `src/index.ts` via Elysia's `.group()`.

## Directory Structure

```
routes/
└── v1/
    ├── webhooks.ts              # Elysia plugin that mounts all webhook routes
    ├── webhooks/
    │   └── clerk/
    │       └── user-created.ts  # Handler for Clerk user.created webhook
    ├── categories.ts            # Elysia plugin for categories routes
    ├── categories/
    │   ├── create.ts
    │   ├── list.ts
    │   ├── update.ts
    │   └── delete.ts
    ├── sources_of_income.ts     # Elysia plugin for sources of income routes
    ├── sources_of_income/
    │   ├── create.ts
    │   ├── list.ts
    │   ├── update.ts
    │   └── delete.ts
    ├── payment_methods.ts       # Elysia plugin for payment methods routes
    └── payment_methods/
        ├── create.ts
        ├── list.ts
        ├── update.ts
        └── delete.ts
```

## Conventions

### File layout

Each route group has two parts:

- **`<resource>.ts`** — the Elysia plugin that declares the route paths and wires handlers together.
- **`<resource>/<action>.ts`** — the handler function for a specific action, exported as a named `const`.

### Naming

| What           | Pattern                          | Example               |
| -------------- | -------------------------------- | --------------------- |
| Plugin file    | `<resource>.ts`                  | `payment_methods.ts`  |
| Handler file   | `<action>.ts`                    | `create.ts`           |
| Handler export | `<action><Resource>` (camelCase) | `createPaymentMethod` |

### Route paths

Standard resource routes follow the shape:

```
/<resource>
/<resource>/:id
```

Webhook routes follow:

```
/webhooks/<provider>/<event>/listener
```

### Authentication

| Strategy     | Middleware       | Used by                                          |
| ------------ | ---------------- | ------------------------------------------------ |
| Bearer token | `withBearerAuth` | `categories`, `sources_of_income`, `webhooks`    |
| Clerk JWT    | `withClerkAuth`  | `payment_methods`                                |

Clerk-authenticated handlers receive `clerk_user_id: string` in their context, injected by the `withClerkAuth` middleware.

### Adding a new endpoint

1. Create the handler in `routes/v1/<resource>/<action>.ts`.
2. Import and register it in `routes/v1/<resource>.ts`.
3. Add the corresponding request/response types under `src/types/<resource>/`.
4. Document the endpoint in this README.

### Caching

List endpoints on non-webhook resources are cached in Redis using read-through caching. The cache is invalidated immediately after any successful mutation (create, update, delete) on the same resource. A 5-minute TTL acts as a safety backstop.

Cache helpers live in `src/middleware/cache.ts` (`cacheGet`, `cacheSet`, `cacheDel`). Caching logic is applied at the service layer — route handlers are unchanged.

| Endpoint | Cache key |
| -------- | --------- |
| `GET /v1/categories` | `categories:list` |
| `GET /v1/sources_of_income` | `sources_of_income:list` |
| `GET /v1/payment_methods` | `payment_methods:list:{clerk_user_id}` |

When adding a new cacheable resource, follow the pattern in `src/services/categories.ts` and document the cache key in this table.

## Current Endpoints

### Webhooks

| Method | Path                                       | Description                                             |
| ------ | ------------------------------------------ | ------------------------------------------------------- |
| `POST` | `/v1/webhooks/clerk/user-created/listener` | Creates a user record from a Clerk `user.created` event |

### Categories

| Method   | Path                  | Auth   | Description               |
| -------- | --------------------- | ------ | ------------------------- |
| `POST`   | `/v1/categories`      | Bearer | Create a new category     |
| `GET`    | `/v1/categories`      | Bearer | List all categories       |
| `PATCH`  | `/v1/categories/:id`  | Bearer | Update a category by id   |
| `DELETE` | `/v1/categories/:id`  | Bearer | Delete a category by id   |

### Sources of Income

| Method   | Path                        | Auth   | Description                        |
| -------- | --------------------------- | ------ | ---------------------------------- |
| `POST`   | `/v1/sources_of_income`     | Bearer | Create a new source of income      |
| `GET`    | `/v1/sources_of_income`     | Bearer | List all sources of income         |
| `PATCH`  | `/v1/sources_of_income/:id` | Bearer | Update a source of income by id    |
| `DELETE` | `/v1/sources_of_income/:id` | Bearer | Delete a source of income by id    |

### Payment Methods

| Method   | Path                       | Auth      | Description                                              |
| -------- | -------------------------- | --------- | -------------------------------------------------------- |
| `POST`   | `/v1/payment_methods`      | Clerk JWT | Create a payment method for the authenticated user       |
| `GET`    | `/v1/payment_methods`      | Clerk JWT | List all payment methods for the authenticated user      |
| `PATCH`  | `/v1/payment_methods/:id`  | Clerk JWT | Update a payment method owned by the authenticated user  |
| `DELETE` | `/v1/payment_methods/:id`  | Clerk JWT | Delete a payment method owned by the authenticated user  |
