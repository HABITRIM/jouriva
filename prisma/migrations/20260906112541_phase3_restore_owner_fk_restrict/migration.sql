-- DropForeignKey
ALTER TABLE "ContentLink" DROP CONSTRAINT "ContentLink_ownerId_fkey";

-- AddForeignKey
ALTER TABLE "ContentLink" ADD CONSTRAINT "ContentLink_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ArticleTranslation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
