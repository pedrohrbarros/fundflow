-- AlterTable: add email (unique) to users
ALTER TABLE "users" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ALTER COLUMN "email" DROP DEFAULT;

-- CreateUniqueIndex on users(email)
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateTable: refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id" BIGSERIAL NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex on refresh_tokens(token_hash)
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
