/*
  Warnings:

  - Added the required column `long_url` to the `Urls` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Urls" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "long_url" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "idx_short_code" ON "Urls"("short_code");

-- CreateIndex
CREATE INDEX "idx_created_at" ON "Urls"("created_at");
