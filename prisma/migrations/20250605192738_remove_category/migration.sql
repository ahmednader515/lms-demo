/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Course` DROP FOREIGN KEY `Course_categoryId_fkey`;

-- DropIndex
DROP INDEX `Course_categoryId_idx` ON `Course`;

-- AlterTable
ALTER TABLE `Course` DROP COLUMN `categoryId`;

-- DropTable
DROP TABLE `Category`;
