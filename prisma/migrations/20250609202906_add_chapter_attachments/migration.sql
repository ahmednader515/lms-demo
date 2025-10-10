/*
  Warnings:

  - You are about to drop the column `courseId` on the `Attachment` table. All the data in the column will be lost.
  - Added the required column `chapterId` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Attachment` DROP FOREIGN KEY `Attachment_courseId_fkey`;

-- DropIndex
DROP INDEX `Attachment_courseId_idx` ON `Attachment`;

-- AlterTable
ALTER TABLE `Attachment` DROP COLUMN `courseId`,
    ADD COLUMN `chapterId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Attachment_chapterId_idx` ON `Attachment`(`chapterId`);

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
