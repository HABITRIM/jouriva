-- AlterTable
ALTER TABLE "ContentLink" ADD COLUMN     "targetDestinationId" TEXT;

-- AddForeignKey
ALTER TABLE "ContentLink" ADD CONSTRAINT "ContentLink_targetDestinationId_fkey" FOREIGN KEY ("targetDestinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
