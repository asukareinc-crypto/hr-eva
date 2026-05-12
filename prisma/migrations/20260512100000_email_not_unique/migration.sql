-- 同一メールで複数ロールのアカウントを許可（社労士・クライアント管理者・従業員）
DROP INDEX IF EXISTS "User_email_key";
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
