# Scripts

Utility shell scripts for database management.

## `migrate.sh`

Runs a combined Prisma + Supabase migration in a single command:

```bash
bun run migrate <descriptive-name>
```

### What it does

1. `prisma migrate dev --name <name>` — generates SQL, applies it to the DB, updates Prisma's migration log
2. `supabase migration new <name>` — creates a matching timestamped file in `supabase/migrations/`
3. Copies the SQL with `IF NOT EXISTS` guards so the Supabase migration is safe to re-run
4. `supabase db push` — registers the migration in Supabase's tracking table
5. `prisma generate` — regenerates the Prisma client

See `prisma/docs/README.md` for the full workflow including one-time setup steps.
