# Prisma Schema Reference

## Models

### User

Represents a registered user. Created when Clerk fires a `user.created` webhook.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BigInt` | PK, auto-increment | Internal surrogate key |
| `external_id` | `String` | UNIQUE, NOT NULL | Clerk user ID (`data.id` from the webhook payload) |

**Table name:** `users` (mapped via `@@map("users")`)

```prisma
model User {
  id          BigInt @id @default(autoincrement())
  external_id String @unique

  @@map("users")
}
```

---

## Running a Migration Against Supabase

Supabase exposes two connection types:

| Type | Port | Use for |
|------|------|---------|
| **Transaction pooler** (default `DATABASE_URL`) | 6543 | App queries at runtime |
| **Direct connection** (`DIRECT_URL`) | 5432 | Prisma migrations |

Prisma reads `DATABASE_URL` for runtime queries and `DIRECT_URL` for migrations. Both must be set in `.env`.

### Step-by-step

**1. Get your connection strings**

Open [Supabase dashboard](https://supabase.com/dashboard) → your project → **Settings** → **Database** → **Connection string**.

Copy:
- **Transaction** tab → paste as `DATABASE_URL` in `.env`
- **Direct** tab → paste as `DIRECT_URL` in `.env`

Your `.env` should contain:
```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres"
```

**2. Add a new model to `prisma/schema.prisma`**

Edit the schema, then validate:

```bash
bunx prisma validate
```

**3. Create and apply the migration**

```bash
bunx prisma migrate dev --name <descriptive-name>
```

This will:
- Connect via `DIRECT_URL`
- Generate a timestamped SQL file under `prisma/migrations/`
- Apply it to your Supabase database
- Regenerate the Prisma client under `src/prisma/`

**4. Verify**

```bash
bunx prisma studio
```

Opens a browser UI where you can inspect your tables and rows.

**5. Commit the migration**

```bash
git add prisma/migrations src/prisma
git commit -m "feat(db): <describe the migration>"
```

> Never edit files inside `prisma/migrations/` or `src/prisma/` manually — they are generated artifacts.

### Deploying to production

For CI/CD or production environments (where you want to apply without prompts):

```bash
bunx prisma migrate deploy
```

This applies all pending migrations without creating new ones. Use this in your deploy pipeline.
