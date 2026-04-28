-- CreateTable
CREATE TABLE "source_of_income_categories" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "source_of_income_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources_of_income" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" BIGINT NOT NULL,
    "income" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "sources_of_income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sources_of_income" (
    "user_id" BIGINT NOT NULL,
    "source_of_income_id" BIGINT NOT NULL,

    CONSTRAINT "user_sources_of_income_pkey" PRIMARY KEY ("user_id","source_of_income_id")
);

-- AddForeignKey
ALTER TABLE "sources_of_income" ADD CONSTRAINT "sources_of_income_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "source_of_income_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sources_of_income" ADD CONSTRAINT "user_sources_of_income_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sources_of_income" ADD CONSTRAINT "user_sources_of_income_source_of_income_id_fkey" FOREIGN KEY ("source_of_income_id") REFERENCES "sources_of_income"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
