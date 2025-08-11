-- AlterTable
ALTER TABLE "public"."TerminalSession" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "TerminalSession_status_idx" ON "public"."TerminalSession"("status");
