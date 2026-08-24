-- Add account credentials for password-based authentication.
ALTER TABLE "User" ADD COLUMN "account" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX "User_account_key" ON "User"("account");
