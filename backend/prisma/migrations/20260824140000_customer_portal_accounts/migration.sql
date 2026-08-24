-- CreateEnum
CREATE TYPE "CustomerAccountStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "customers"
  ADD COLUMN "company_name" TEXT,
  ADD COLUMN "requested_type" "CustomerType" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "account_status" "CustomerAccountStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "password_hash" TEXT;

-- CreateTable
CREATE TABLE "customer_refresh_tokens" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_refresh_tokens_token_key" ON "customer_refresh_tokens"("token");

-- AddForeignKey
ALTER TABLE "customer_refresh_tokens" ADD CONSTRAINT "customer_refresh_tokens_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
