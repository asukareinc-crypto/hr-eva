-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SR_ADMIN', 'CLIENT_ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "EvaluationItemType" AS ENUM ('ACHIEVEMENT', 'COMPETENCY', 'MBO', 'PEER');

-- CreateEnum
CREATE TYPE "EvaluationPeriodStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('NOT_STARTED', 'SELF_IN_PROGRESS', 'SELF_DONE', 'MANAGER_IN_PROGRESS', 'MANAGER_DONE', 'FINALIZED');

-- CreateEnum
CREATE TYPE "EvaluatorRole" AS ENUM ('SELF', 'MANAGER', 'PEER', 'SKIP_LEVEL');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "tenantId" TEXT,
    "clientId" TEXT,
    "employeeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastNameKana" TEXT,
    "firstNameKana" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "retireDate" TIMESTAMP(3),
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "departmentId" TEXT,
    "positionId" TEXT,
    "managerEmployeeId" TEXT,
    "birthDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "EvaluationItemType" NOT NULL DEFAULT 'ACHIEVEMENT',
    "weight" INTEGER NOT NULL DEFAULT 1,
    "maxScore" INTEGER NOT NULL DEFAULT 5,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EvaluationTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationPeriod" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "EvaluationPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationAssignment" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "evaluatorEmployeeId" TEXT NOT NULL,
    "role" "EvaluatorRole" NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationScore" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "score" INTEGER,
    "comment" TEXT,

    CONSTRAINT "EvaluationScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WageRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "basicSalary" INTEGER NOT NULL DEFAULT 0,
    "overtimeAllowance" INTEGER NOT NULL DEFAULT 0,
    "otherAllowance" INTEGER NOT NULL DEFAULT 0,
    "deduction" INTEGER NOT NULL DEFAULT 0,
    "netPay" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "granted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "takenDate" TIMESTAMP(3) NOT NULL,
    "days" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_clientId_idx" ON "User"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Department_clientId_idx" ON "Department"("clientId");

-- CreateIndex
CREATE INDEX "Position_clientId_idx" ON "Position"("clientId");

-- CreateIndex
CREATE INDEX "Employee_clientId_idx" ON "Employee"("clientId");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_clientId_employeeCode_key" ON "Employee"("clientId", "employeeCode");

-- CreateIndex
CREATE INDEX "EvaluationTemplate_tenantId_idx" ON "EvaluationTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "EvaluationTemplateItem_templateId_idx" ON "EvaluationTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "EvaluationPeriod_clientId_idx" ON "EvaluationPeriod"("clientId");

-- CreateIndex
CREATE INDEX "Evaluation_employeeId_idx" ON "Evaluation"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_periodId_employeeId_key" ON "Evaluation"("periodId", "employeeId");

-- CreateIndex
CREATE INDEX "EvaluationAssignment_evaluationId_idx" ON "EvaluationAssignment"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationAssignment_evaluationId_evaluatorEmployeeId_role_key" ON "EvaluationAssignment"("evaluationId", "evaluatorEmployeeId", "role");

-- CreateIndex
CREATE INDEX "EvaluationScore_assignmentId_idx" ON "EvaluationScore"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationScore_assignmentId_itemId_key" ON "EvaluationScore"("assignmentId", "itemId");

-- CreateIndex
CREATE INDEX "WageRecord_employeeId_idx" ON "WageRecord"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "WageRecord_employeeId_yearMonth_key" ON "WageRecord"("employeeId", "yearMonth");

-- CreateIndex
CREATE INDEX "LeaveBalance_employeeId_idx" ON "LeaveBalance"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_year_key" ON "LeaveBalance"("employeeId", "year");

-- CreateIndex
CREATE INDEX "LeaveRecord_employeeId_takenDate_idx" ON "LeaveRecord"("employeeId", "takenDate");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationTemplate" ADD CONSTRAINT "EvaluationTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationTemplateItem" ADD CONSTRAINT "EvaluationTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvaluationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationPeriod" ADD CONSTRAINT "EvaluationPeriod_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationPeriod" ADD CONSTRAINT "EvaluationPeriod_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvaluationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAssignment" ADD CONSTRAINT "EvaluationAssignment_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAssignment" ADD CONSTRAINT "EvaluationAssignment_evaluatorEmployeeId_fkey" FOREIGN KEY ("evaluatorEmployeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationScore" ADD CONSTRAINT "EvaluationScore_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EvaluationAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationScore" ADD CONSTRAINT "EvaluationScore_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "EvaluationTemplateItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WageRecord" ADD CONSTRAINT "WageRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRecord" ADD CONSTRAINT "LeaveRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
