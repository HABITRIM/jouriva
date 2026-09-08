-- DropForeignKey
ALTER TABLE "ContentLink" DROP CONSTRAINT "ContentLink_ownerId_fkey";

-- AlterTable
ALTER TABLE "ContentLink" ALTER COLUMN "ownerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ContentLink" ADD CONSTRAINT "ContentLink_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ArticleTranslation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
