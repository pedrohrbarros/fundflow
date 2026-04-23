-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" BIGSERIAL NOT NULL,
    "external_id" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_external_id_key" ON "users"("external_id");
