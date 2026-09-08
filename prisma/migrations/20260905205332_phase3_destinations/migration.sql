/*
  Warnings:

  - Added the required column `updatedAt` to the `Destination` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DestinationTranslation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Destination" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "heroAssetId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "DestinationTranslation" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "blocks" JSONB,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "faqGroupId" TEXT,
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "noindex" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verificationNotes" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus",
ADD COLUMN     "verifiedById" TEXT,
ADD COLUMN     "warningEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workflowStatus" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "DestinationMedia" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DestinationMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicTranslation" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "TopicTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleTopic" (
    "articleId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleTopic_pkey" PRIMARY KEY ("articleId","topicId")
);

-- CreateTable
CREATE TABLE "DestinationTopic" (
    "destinationId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "DestinationTopic_pkey" PRIMARY KEY ("destinationId","topicId")
);

-- CreateTable
CREATE TABLE "ArticleDestination" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SECONDARY',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleDestination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DestinationMedia_destinationId_position_idx" ON "DestinationMedia"("destinationId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationMedia_destinationId_assetId_key" ON "DestinationMedia"("destinationId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_key_key" ON "Topic"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TopicTranslation_topicId_locale_key" ON "TopicTranslation"("topicId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "TopicTranslation_locale_slug_key" ON "TopicTranslation"("locale", "slug");

-- CreateIndex
CREATE INDEX "ArticleTopic_topicId_idx" ON "ArticleTopic"("topicId");

-- CreateIndex
CREATE INDEX "DestinationTopic_topicId_idx" ON "DestinationTopic"("topicId");

-- CreateIndex
CREATE INDEX "ArticleDestination_destinationId_role_idx" ON "ArticleDestination"("destinationId", "role");

-- CreateIndex
CREATE INDEX "ArticleDestination_articleId_idx" ON "ArticleDestination"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleDestination_articleId_destinationId_key" ON "ArticleDestination"("articleId", "destinationId");

-- CreateIndex
CREATE INDEX "Destination_countryId_idx" ON "Destination"("countryId");

-- CreateIndex
CREATE INDEX "Destination_cityId_idx" ON "Destination"("cityId");

-- CreateIndex
CREATE INDEX "Destination_isFeatured_sortOrder_idx" ON "Destination"("isFeatured", "sortOrder");

-- CreateIndex
CREATE INDEX "DestinationTranslation_locale_workflowStatus_idx" ON "DestinationTranslation"("locale", "workflowStatus");

-- CreateIndex
CREATE INDEX "DestinationTranslation_workflowStatus_publishedAt_idx" ON "DestinationTranslation"("workflowStatus", "publishedAt");

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_heroAssetId_fkey" FOREIGN KEY ("heroAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationTranslation" ADD CONSTRAINT "DestinationTranslation_faqGroupId_fkey" FOREIGN KEY ("faqGroupId") REFERENCES "FaqGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationTranslation" ADD CONSTRAINT "DestinationTranslation_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationMedia" ADD CONSTRAINT "DestinationMedia_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationMedia" ADD CONSTRAINT "DestinationMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicTranslation" ADD CONSTRAINT "TopicTranslation_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTopic" ADD CONSTRAINT "ArticleTopic_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTopic" ADD CONSTRAINT "ArticleTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationTopic" ADD CONSTRAINT "DestinationTopic_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationTopic" ADD CONSTRAINT "DestinationTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDestination" ADD CONSTRAINT "ArticleDestination_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDestination" ADD CONSTRAINT "ArticleDestination_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
