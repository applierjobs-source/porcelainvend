-- AlterTable
ALTER TABLE "Machine" ADD COLUMN "squarespaceOAuthRefreshTokenEnc" TEXT,
ADD COLUMN "squarespaceOAuthAccessTokenEnc" TEXT,
ADD COLUMN "squarespaceOAuthAccessExpiresAt" TIMESTAMP(3);
