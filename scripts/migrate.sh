#!/bin/bash
set -e

NAME="${1}"

if [ -z "$NAME" ]; then
  echo "Usage: bun run migrate <migration-name>"
  exit 1
fi

echo "Running Prisma migration: $NAME"
bunx prisma migrate dev --name "$NAME"

PRISMA_SQL=$(ls -t prisma/migrations/*/migration.sql | head -1)
echo "Prisma migration created: $PRISMA_SQL"

bunx supabase migration new "$NAME"

SUPABASE_SQL=$(ls -t supabase/migrations/*.sql | head -1)
echo "Supabase migration created: $SUPABASE_SQL"

sed 's/CREATE TABLE /CREATE TABLE IF NOT EXISTS /g
     s/CREATE UNIQUE INDEX /CREATE UNIQUE INDEX IF NOT EXISTS /g
     s/CREATE INDEX /CREATE INDEX IF NOT EXISTS /g' "$PRISMA_SQL" > "$SUPABASE_SQL"

echo "Pushing to Supabase..."
bunx supabase db push

# The push above can be declined at its confirmation prompt, or stop early on an
# earlier migration that is applied but unregistered, without failing loudly here.
# Confirm the migration actually landed rather than trusting that the file was written.
echo "Verifying the migration was deployed..."
bash scripts/check-migrations.sh

echo "Done. Files to commit:"
echo "  $PRISMA_SQL"
echo "  $SUPABASE_SQL"
echo "  src/prisma/"
