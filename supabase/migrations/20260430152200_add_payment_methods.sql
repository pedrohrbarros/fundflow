-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_methods" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "bank" TEXT,
    "receiver" TEXT,
    "user_id" BIGINT NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
