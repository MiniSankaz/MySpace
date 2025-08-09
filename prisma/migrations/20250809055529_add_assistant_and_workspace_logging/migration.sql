/*
  Warnings:

  - You are about to drop the `ApiConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ApiConfig" DROP CONSTRAINT "ApiConfig_userId_fkey";

-- DropTable
DROP TABLE "public"."ApiConfig";

-- CreateTable
CREATE TABLE "public"."AssistantChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "sessionName" TEXT,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssistantChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "tokensUsed" INTEGER,
    "cost" DOUBLE PRECISION,
    "latency" INTEGER,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssistantCommand" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messageId" TEXT,
    "projectId" TEXT,
    "command" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "output" TEXT,
    "error" TEXT,
    "executedAt" TIMESTAMP(3),
    "executedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssistantFile" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "projectId" TEXT,
    "filePath" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "content" TEXT,
    "diff" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssistantAnalytics" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "date" DATE NOT NULL,
    "messagesCount" INTEGER NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commandsCount" INTEGER NOT NULL DEFAULT 0,
    "filesModified" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "avgLatency" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkspaceTerminalSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tabName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "currentPath" TEXT NOT NULL,
    "environment" JSONB,
    "pid" INTEGER,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceTerminalSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkspaceTerminalCommand" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "workingDir" TEXT NOT NULL,
    "output" TEXT,
    "errorOutput" TEXT,
    "exitCode" INTEGER,
    "duration" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceTerminalCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkspaceTerminalLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rawContent" TEXT,
    "sequence" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceTerminalLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantChatSession_userId_idx" ON "public"."AssistantChatSession"("userId");

-- CreateIndex
CREATE INDEX "AssistantChatSession_projectId_idx" ON "public"."AssistantChatSession"("projectId");

-- CreateIndex
CREATE INDEX "AssistantChatSession_lastActiveAt_idx" ON "public"."AssistantChatSession"("lastActiveAt");

-- CreateIndex
CREATE INDEX "AssistantChatMessage_sessionId_timestamp_idx" ON "public"."AssistantChatMessage"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "AssistantChatMessage_userId_idx" ON "public"."AssistantChatMessage"("userId");

-- CreateIndex
CREATE INDEX "AssistantChatMessage_projectId_idx" ON "public"."AssistantChatMessage"("projectId");

-- CreateIndex
CREATE INDEX "AssistantChatMessage_role_idx" ON "public"."AssistantChatMessage"("role");

-- CreateIndex
CREATE INDEX "AssistantCommand_sessionId_idx" ON "public"."AssistantCommand"("sessionId");

-- CreateIndex
CREATE INDEX "AssistantCommand_projectId_idx" ON "public"."AssistantCommand"("projectId");

-- CreateIndex
CREATE INDEX "AssistantCommand_status_idx" ON "public"."AssistantCommand"("status");

-- CreateIndex
CREATE INDEX "AssistantCommand_type_idx" ON "public"."AssistantCommand"("type");

-- CreateIndex
CREATE INDEX "AssistantFile_sessionId_idx" ON "public"."AssistantFile"("sessionId");

-- CreateIndex
CREATE INDEX "AssistantFile_projectId_idx" ON "public"."AssistantFile"("projectId");

-- CreateIndex
CREATE INDEX "AssistantFile_action_idx" ON "public"."AssistantFile"("action");

-- CreateIndex
CREATE INDEX "AssistantFile_timestamp_idx" ON "public"."AssistantFile"("timestamp");

-- CreateIndex
CREATE INDEX "AssistantAnalytics_userId_idx" ON "public"."AssistantAnalytics"("userId");

-- CreateIndex
CREATE INDEX "AssistantAnalytics_projectId_idx" ON "public"."AssistantAnalytics"("projectId");

-- CreateIndex
CREATE INDEX "AssistantAnalytics_date_idx" ON "public"."AssistantAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantAnalytics_userId_projectId_date_key" ON "public"."AssistantAnalytics"("userId", "projectId", "date");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalSession_projectId_idx" ON "public"."WorkspaceTerminalSession"("projectId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalSession_workspaceId_idx" ON "public"."WorkspaceTerminalSession"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalSession_userId_idx" ON "public"."WorkspaceTerminalSession"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalSession_active_idx" ON "public"."WorkspaceTerminalSession"("active");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalSession_startedAt_idx" ON "public"."WorkspaceTerminalSession"("startedAt");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalCommand_sessionId_idx" ON "public"."WorkspaceTerminalCommand"("sessionId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalCommand_projectId_idx" ON "public"."WorkspaceTerminalCommand"("projectId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalCommand_userId_idx" ON "public"."WorkspaceTerminalCommand"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalCommand_timestamp_idx" ON "public"."WorkspaceTerminalCommand"("timestamp");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalLog_sessionId_sequence_idx" ON "public"."WorkspaceTerminalLog"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalLog_projectId_idx" ON "public"."WorkspaceTerminalLog"("projectId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalLog_userId_idx" ON "public"."WorkspaceTerminalLog"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalLog_type_idx" ON "public"."WorkspaceTerminalLog"("type");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalLog_timestamp_idx" ON "public"."WorkspaceTerminalLog"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."AssistantChatSession" ADD CONSTRAINT "AssistantChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantChatSession" ADD CONSTRAINT "AssistantChatSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantChatMessage" ADD CONSTRAINT "AssistantChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AssistantChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantChatMessage" ADD CONSTRAINT "AssistantChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantChatMessage" ADD CONSTRAINT "AssistantChatMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantCommand" ADD CONSTRAINT "AssistantCommand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AssistantChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantCommand" ADD CONSTRAINT "AssistantCommand_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantFile" ADD CONSTRAINT "AssistantFile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AssistantChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantFile" ADD CONSTRAINT "AssistantFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantAnalytics" ADD CONSTRAINT "AssistantAnalytics_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AssistantChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantAnalytics" ADD CONSTRAINT "AssistantAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantAnalytics" ADD CONSTRAINT "AssistantAnalytics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalSession" ADD CONSTRAINT "WorkspaceTerminalSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalSession" ADD CONSTRAINT "WorkspaceTerminalSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalCommand" ADD CONSTRAINT "WorkspaceTerminalCommand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."WorkspaceTerminalSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalCommand" ADD CONSTRAINT "WorkspaceTerminalCommand_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalCommand" ADD CONSTRAINT "WorkspaceTerminalCommand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalLog" ADD CONSTRAINT "WorkspaceTerminalLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."WorkspaceTerminalSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalLog" ADD CONSTRAINT "WorkspaceTerminalLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalLog" ADD CONSTRAINT "WorkspaceTerminalLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
