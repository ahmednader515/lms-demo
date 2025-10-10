-- AlterTable
ALTER TABLE `Quiz` ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT false;

-- Add position column with default value
ALTER TABLE `Quiz` ADD COLUMN `position` INTEGER NOT NULL DEFAULT 1;

-- Update existing quizzes to have sequential positions
SET @row_number = 0;
UPDATE `Quiz` SET `position` = (@row_number:=@row_number + 1) ORDER BY `createdAt`;
