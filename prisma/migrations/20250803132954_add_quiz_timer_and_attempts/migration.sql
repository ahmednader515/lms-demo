-- DropForeignKey
ALTER TABLE `QuizResult` DROP FOREIGN KEY `QuizResult_studentId_fkey`;

-- DropIndex
DROP INDEX `QuizResult_studentId_quizId_key` ON `QuizResult`;

-- AlterTable
ALTER TABLE `Quiz` ADD COLUMN `maxAttempts` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `timer` INTEGER NULL;

-- AlterTable
ALTER TABLE `QuizResult` ADD COLUMN `attemptNumber` INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX `QuizResult_studentId_quizId_idx` ON `QuizResult`(`studentId`, `quizId`);

-- AddForeignKey
ALTER TABLE `QuizResult` ADD CONSTRAINT `QuizResult_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
