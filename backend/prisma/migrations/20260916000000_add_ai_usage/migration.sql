-- CreateTable
CREATE TABLE "ai_usage" (
    "id" UUID NOT NULL,
    "caller_id" VARCHAR(200) NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_caller_id_day_key" ON "ai_usage"("caller_id", "day");

-- CreateIndex
CREATE INDEX "ai_usage_day_idx" ON "ai_usage"("day");