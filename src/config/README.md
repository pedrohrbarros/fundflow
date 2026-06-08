# Config

Singleton initialisation for all external clients and global settings. Import from here — never instantiate clients directly in service or route files.

## Files

### `db.ts`

Exports the Prisma client singleton (`db`). Initialised once and reused across the process.

```typescript
import { db } from '../config/db'
```

### `logging.ts`

Exports pino logger instances. Each logger carries a fixed `context` field so log lines can be filtered by source.

| Export             | Context field | Where used                                |
| ------------------ | ------------- | ----------------------------------------- |
| `logger`           | —             | App startup (`src/index.ts`)              |
| `endpoint_logger`  | `endpoint`    | `onRequest`, `onAfterResponse`, `onError` |
| `db_logger`        | `db`          | Prisma query/info/warn/error events       |
| `migration_logger` | `migration`   | TypeScript migration scripts              |

Output format is controlled by `NODE_ENV` and `LOG_LEVEL` environment variables.

### `openapi.ts`

Exports `open_api_config` — the configuration object passed to `@elysiajs/swagger`. Defines:

- API title, description, and version
- `apiKey` security scheme (`X-Api-Key` header)
- Global security requirement (`apiKey` on every route by default)
- Tag definitions for endpoint grouping in Swagger UI

### `redis.ts`

Exports the Redis client singleton. Used by the cache middleware.

### `clerk.ts`

Exports `getClerkPublicKey()` — fetches and caches the Clerk instance's RSA public key used to verify JWT signatures. Caches the key in memory to avoid repeated network calls.
