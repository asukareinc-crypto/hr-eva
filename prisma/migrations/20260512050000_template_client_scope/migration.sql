ALTER TABLE "EvaluationTemplate" ADD COLUMN "clientId" TEXT;
CREATE INDEX "EvaluationTemplate_clientId_idx" ON "EvaluationTemplate"("clientId");
