-- CreateEnum
CREATE TYPE "PeriodHalf" AS ENUM ('UPPER', 'LOWER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EvaluationStatus" ADD VALUE 'FINAL_IN_PROGRESS';
ALTER TYPE "EvaluationStatus" ADD VALUE 'FINAL_DONE';

-- AlterEnum
ALTER TYPE "EvaluatorRole" ADD VALUE 'FINAL';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "finalEvaluatorEmployeeId" TEXT,
ADD COLUMN     "gradeId" TEXT;

-- AlterTable
ALTER TABLE "EvaluationPeriod" ADD COLUMN     "feedbackPeriodMonth" INTEGER,
ADD COLUMN     "finalEvalDueDate" TIMESTAMP(3),
ADD COLUMN     "half" "PeriodHalf",
ADD COLUMN     "primaryEvalDueDate" TIMESTAMP(3),
ADD COLUMN     "selfEvalDueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "description" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "isManager" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationItemLevel" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "EvaluationItemLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackMeeting" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "conductedDate" TIMESTAMP(3),
    "good1" TEXT,
    "good2" TEXT,
    "good3" TEXT,
    "improve1" TEXT,
    "improve2" TEXT,
    "improve3" TEXT,
    "goal" TEXT,
    "conductedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Grade_clientId_idx" ON "Grade"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_clientId_rank_key" ON "Grade"("clientId", "rank");

-- CreateIndex
CREATE INDEX "EvaluationItemLevel_itemId_idx" ON "EvaluationItemLevel"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationItemLevel_itemId_score_key" ON "EvaluationItemLevel"("itemId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackMeeting_evaluationId_key" ON "FeedbackMeeting"("evaluationId");

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_finalEvaluatorEmployeeId_fkey" FOREIGN KEY ("finalEvaluatorEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationItemLevel" ADD CONSTRAINT "EvaluationItemLevel_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "EvaluationTemplateItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackMeeting" ADD CONSTRAINT "FeedbackMeeting_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
