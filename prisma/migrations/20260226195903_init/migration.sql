-- CreateTable
CREATE TABLE "Urls" (
    "id" BIGSERIAL NOT NULL,
    "short_code" TEXT NOT NULL,

    CONSTRAINT "Urls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Urls_short_code_key" ON "Urls"("short_code");
