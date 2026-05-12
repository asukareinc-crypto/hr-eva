-- 機能トグル: クライアント企業ごとに賃金・有給機能をON/OFF
ALTER TABLE "Client"
  ADD COLUMN "wageEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "leaveEnabled" BOOLEAN NOT NULL DEFAULT true;
