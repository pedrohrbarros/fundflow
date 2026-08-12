#!/bin/bash

# Verify that every committed migration is actually deployed to the linked Supabase
# database.
#
# A migration file in the repo proves nothing on its own: `supabase db push` can be
# skipped entirely, declined at its confirmation prompt, or stop early on an earlier
# migration that is applied but unregistered. Nothing fails at that moment. The break
# only appears once code expects the new column, and then every query against that
# table fails with Prisma P2022 ("column does not exist") — a 500 in production rather
# than a failing test, because CI builds its own database and never sees the real one.
#
# Read-only: --dry-run never writes to the database.

set -e

OUTPUT=$(bunx supabase db push --dry-run < /dev/null 2>&1) || true

if echo "$OUTPUT" | grep -q "Remote database is up to date."; then
  echo "All migrations are deployed: the remote database is up to date."
  exit 0
fi

echo "$OUTPUT"
echo ""
echo "ERROR: migrations are committed but NOT deployed to the remote database."
echo ""
echo "Deploy them with:"
echo "  bunx supabase db push"
echo ""
echo "If a listed migration is already applied to the database but unregistered, then"
echo "re-running it may fail (an idempotent ADD COLUMN is safe; a data backfill that"
echo "reads a since-dropped table is not). Register it without re-running it:"
echo "  bunx supabase migration repair --status applied <version>"
exit 1
