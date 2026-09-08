-- CreateTable
CREATE TABLE "SearchQueryEvent" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQueryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchQueryEvent_createdAt_idx" ON "SearchQueryEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SearchQueryEvent_normalized_locale_idx" ON "SearchQueryEvent"("normalized", "locale");
