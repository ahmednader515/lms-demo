/*
  Warnings:

  - You are about to drop the column `muxUploadId` on the `Chapter` table. All the data in the column will be lost.
  - You are about to drop the `MuxData` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `MuxData` DROP FOREIGN KEY `MuxData_chapterId_fkey`;

-- AlterTable
ALTER TABLE `Chapter` DROP COLUMN `muxUploadId`;

-- DropTable
DROP TABLE `MuxData`;
