-- AlterTable
ALTER TABLE "ContentLink" ADD COLUMN     "ownerDestinationTranslationId" TEXT;

-- CreateIndex
CREATE INDEX "ContentLink_ownerDestinationTranslationId_idx" ON "ContentLink"("ownerDestinationTranslationId");

-- AddForeignKey
ALTER TABLE "ContentLink" ADD CONSTRAINT "ContentLink_ownerDestinationTranslationId_fkey" FOREIGN KEY ("ownerDestinationTranslationId") REFERENCES "DestinationTranslation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
