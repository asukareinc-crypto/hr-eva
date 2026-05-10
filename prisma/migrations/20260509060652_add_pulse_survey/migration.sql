-- CreateEnum
CREATE TYPE "PulseQuestionType" AS ENUM ('SCORE_5', 'TEXT', 'YES_NO');

-- CreateEnum
CREATE TYPE "PulseSurveyStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "PulseQuestion" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "description" TEXT,
    "type" "PulseQuestionType" NOT NULL DEFAULT 'SCORE_5',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "allowComment" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PulseQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PulseSurvey" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "PulseSurveyStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PulseSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PulseResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "averageScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PulseResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PulseAnswer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "score" INTEGER,
    "text" TEXT,
    "comment" TEXT,

    CONSTRAINT "PulseAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PulseQuestion_clientId_idx" ON "PulseQuestion"("clientId");

-- CreateIndex
CREATE INDEX "PulseSurvey_clientId_idx" ON "PulseSurvey"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PulseSurvey_clientId_yearMonth_key" ON "PulseSurvey"("clientId", "yearMonth");

-- CreateIndex
CREATE INDEX "PulseResponse_employeeId_idx" ON "PulseResponse"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PulseResponse_surveyId_employeeId_key" ON "PulseResponse"("surveyId", "employeeId");

-- CreateIndex
CREATE INDEX "PulseAnswer_responseId_idx" ON "PulseAnswer"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "PulseAnswer_responseId_questionId_key" ON "PulseAnswer"("responseId", "questionId");

-- AddForeignKey
ALTER TABLE "PulseQuestion" ADD CONSTRAINT "PulseQuestion_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseSurvey" ADD CONSTRAINT "PulseSurvey_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseResponse" ADD CONSTRAINT "PulseResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PulseSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseResponse" ADD CONSTRAINT "PulseResponse_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseAnswer" ADD CONSTRAINT "PulseAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "PulseResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseAnswer" ADD CONSTRAINT "PulseAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PulseQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
