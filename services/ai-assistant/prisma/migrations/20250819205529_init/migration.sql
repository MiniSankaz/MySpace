/*
  Warnings:

  - The primary key for the `rate_limits` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `usage_tracking` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_context` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `ai_usage_alerts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_usage_daily_aggregates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_usage_hourly_aggregates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_usage_metrics` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `total_interactions` on table `user_context` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."rate_limits" DROP CONSTRAINT "rate_limits_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "limit_type" SET DATA TYPE TEXT,
ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."usage_tracking" DROP CONSTRAINT "usage_tracking_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "session_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."user_context" DROP CONSTRAINT "user_context_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "total_interactions" SET NOT NULL,
ADD CONSTRAINT "user_context_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "public"."ai_usage_alerts";

-- DropTable
DROP TABLE "public"."ai_usage_daily_aggregates";

-- DropTable
DROP TABLE "public"."ai_usage_hourly_aggregates";

-- DropTable
DROP TABLE "public"."ai_usage_metrics";

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" TIMESTAMP(3),
    "phoneVerified" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "accountLockedUntil" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_folders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#3B82F6',
    "icon" TEXT DEFAULT 'folder',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN DEFAULT false,
    "sessionCount" INTEGER DEFAULT 0,

    CONSTRAINT "chat_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_sessions" (
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
    "title" TEXT DEFAULT 'Untitled Session',
    "isActive" BOOLEAN DEFAULT true,
    "folderId" TEXT,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_messages" (
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

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiRateLimit" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiUsageLog" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "responseTime" INTEGER NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiWebhook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastStatus" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiWebhook_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."AssistantNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssistantReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "time" TIMESTAMP(3) NOT NULL,
    "recurring" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssistantTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BackupExport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "filters" JSONB,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "recordCount" INTEGER,
    "compression" BOOLEAN NOT NULL DEFAULT false,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BackupExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BackupSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "cronPattern" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "filters" JSONB,
    "settings" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatConversation" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "visitorName" TEXT,
    "visitorEmail" TEXT,
    "visitorPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "rating" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "agentId" TEXT,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatSettings" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "welcomeMessage" JSONB NOT NULL,
    "offlineMessage" JSONB NOT NULL,
    "workingHours" JSONB NOT NULL,
    "autoReplyDelay" INTEGER NOT NULL DEFAULT 5,
    "theme" JSONB NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "departments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "managerId" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preheader" TEXT,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "replyTo" TEXT,
    "content" JSONB NOT NULL,
    "template" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "targetTags" TEXT[],
    "excludeTags" TEXT[],
    "stats" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailCampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EmailCampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "customFields" JSONB,
    "source" TEXT,
    "confirmToken" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeToken" TEXT NOT NULL,
    "bounceCount" INTEGER NOT NULL DEFAULT 0,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Form" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "honeypot" BOOLEAN NOT NULL DEFAULT true,
    "recaptcha" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'new',
    "submittedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Gallery" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GalleryMedia" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GalleryMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GitConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectPath" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "isGitRepo" BOOLEAN NOT NULL,
    "isBare" BOOLEAN NOT NULL,
    "workingDir" TEXT NOT NULL,
    "currentBranch" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL,
    "isClean" BOOLEAN NOT NULL,
    "ahead" INTEGER NOT NULL DEFAULT 0,
    "behind" INTEGER NOT NULL DEFAULT 0,
    "staged" INTEGER NOT NULL DEFAULT 0,
    "modified" INTEGER NOT NULL DEFAULT 0,
    "untracked" INTEGER NOT NULL DEFAULT 0,
    "userName" TEXT,
    "userEmail" TEXT,
    "remotes" JSONB NOT NULL,
    "branches" JSONB NOT NULL,
    "config" JSONB NOT NULL,
    "gitVersion" TEXT,
    "lastFetch" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GitConfigHistory" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "details" JSONB,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitConfigHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KBAttachment" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KBAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KBCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KBCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KBIssue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "errorMessage" TEXT,
    "stackTrace" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "categoryId" TEXT,
    "environment" TEXT,
    "affectedComponents" TEXT[],
    "reproductionSteps" TEXT,
    "businessImpact" TEXT,
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KBIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KBIssueRelation" (
    "id" TEXT NOT NULL,
    "parentIssueId" TEXT NOT NULL,
    "relatedIssueId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KBIssueRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KBIssueTag" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "KBIssueTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KBSearchIndex" (
    "id" TEXT NOT NULL,
    "issueId" TEXT,
    "solutionId" TEXT,
    "contentVector" TEXT,
    "contentText" TEXT NOT NULL,
    "lastIndexed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KBSearchIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KBSolution" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "codeSnippet" TEXT,
    "rootCause" TEXT,
    "preventionSteps" TEXT,
    "effectivenessScore" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KBSolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KBSolutionFeedback" (
    "id" TEXT NOT NULL,
    "solutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "resolvedIssue" BOOLEAN NOT NULL,
    "timeToResolve" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KBSolutionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KBTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KBTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoginHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "alt" TEXT,
    "caption" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "metadata" JSONB,
    "folderId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "scanStatus" TEXT NOT NULL DEFAULT 'pending',
    "scanResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MediaFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MediaTag" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "MediaTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Menu" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MenuItem" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT '_self',
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Page" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT,
    "components" JSONB,
    "excerpt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogImage" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "translations" JSONB,
    "layout" TEXT NOT NULL DEFAULT 'default',
    "template" TEXT,
    "templateId" TEXT,
    "customCss" TEXT,
    "customJs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "authorId" TEXT,
    "featuredImage" TEXT,
    "isHomePage" BOOLEAN NOT NULL DEFAULT false,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "seoTitle" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PageComponent" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "settings" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "columnIndex" INTEGER,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PageTemplate" (
    "id" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "code" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "preview" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordReset" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Portfolio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGainLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGainLossPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dayChange" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dayChangePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "gainLoss" DOUBLE PRECISION NOT NULL,
    "gainLossPercentage" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Position" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "averageCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gainLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gainLossPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dayChange" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dayChangePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT,
    "excerpt" TEXT,
    "featuredImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "categoryId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostTag" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "envVariables" JSONB NOT NULL DEFAULT '{}',
    "scripts" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "customIcon" TEXT,
    "customColor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectStatusCache" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gitStatus" JSONB,
    "terminalStatus" JSONB,
    "buildStatus" TEXT,
    "hasErrors" BOOLEAN NOT NULL DEFAULT false,
    "hasWarnings" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectStatusCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Stock" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT,
    "type" TEXT DEFAULT 'EQUITY',
    "sector" TEXT,
    "industry" TEXT,
    "currentPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previousClose" DOUBLE PRECISION DEFAULT 0,
    "dayChange" DOUBLE PRECISION DEFAULT 0,
    "dayChangePercent" DOUBLE PRECISION DEFAULT 0,
    "volume" INTEGER DEFAULT 0,
    "marketCap" BIGINT,
    "pe" DOUBLE PRECISION,
    "eps" DOUBLE PRECISION,
    "beta" DOUBLE PRECISION,
    "dividendYield" DOUBLE PRECISION,
    "weekHigh52" DOUBLE PRECISION,
    "weekLow52" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "lastUpdated" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockPriceHistory" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "adjustedClose" DOUBLE PRECISION,
    "volume" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriberTag" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "SubscriberTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Survey" (
    "id" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "slug" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "maxResponses" INTEGER,
    "requireAuth" BOOLEAN NOT NULL DEFAULT false,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "metadata" JSONB,
    "score" INTEGER,
    "respondentId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "leaderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TerminalAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "date" DATE NOT NULL,
    "commandCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "uniqueCommands" JSONB NOT NULL,
    "commonPatterns" JSONB NOT NULL,
    "errorPatterns" JSONB NOT NULL,
    "workflowPatterns" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminalAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TerminalCommand" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "exitCode" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerminalCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TerminalCommandPattern" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "avgDuration" INTEGER,
    "successRate" DOUBLE PRECISION,
    "suggestedSop" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminalCommandPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TerminalLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "direction" TEXT,
    "content" TEXT NOT NULL,
    "rawContent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sequence" INTEGER NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "TerminalLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TerminalSOP" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "workflow" JSONB NOT NULL,
    "triggers" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "avgDuration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminalSOP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TerminalSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "tabName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "output" JSONB NOT NULL DEFAULT '[]',
    "currentPath" TEXT NOT NULL,
    "pid" INTEGER,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "TerminalSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TerminalSessionState" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "outputBuffer" JSONB NOT NULL DEFAULT '[]',
    "cursorPosition" JSONB,
    "workingDirectory" TEXT,
    "environmentVars" JSONB,
    "uiState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminalSessionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TerminalShortcut" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "alias" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminalShortcut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThemeConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "colors" JSONB NOT NULL,
    "fonts" JSONB NOT NULL,
    "layout" JSONB NOT NULL,
    "components" JSONB,
    "customCss" TEXT,
    "customJs" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ThemeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Trade" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION DEFAULT 0,
    "notes" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Translation" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT 'common',
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsed" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserDepartment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "position" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "UserDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "deviceName" TEXT,
    "platform" TEXT,
    "pushToken" TEXT,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "message" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "language" TEXT NOT NULL DEFAULT 'en',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "newsletter" BOOLEAN NOT NULL DEFAULT false,
    "notifications" JSONB,
    "preferences" JSONB,
    "socialLinks" JSONB,
    "occupation" TEXT,
    "company" TEXT,
    "website" TEXT,
    "interests" TEXT[],
    "skills" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSidebarSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER NOT NULL DEFAULT 250,
    "sortBy" TEXT NOT NULL DEFAULT 'lastAccessed',
    "viewMode" TEXT NOT NULL DEFAULT 'icons',
    "showStatusIndicators" BOOLEAN NOT NULL DEFAULT true,
    "groupBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSidebarSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WatchlistStock" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "notes" TEXT,
    "alertPrice" DOUBLE PRECISION,
    "alertType" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistStock_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."assistant_conversation_legacy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT,
    "folderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_message_legacy" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_createdat_idx" ON "public"."users"("createdAt");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_isactive_deletedat_idx" ON "public"."users"("isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "chat_folders_userid_idx" ON "public"."chat_folders"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_folders_userid_name_key" ON "public"."chat_folders"("userId", "name");

-- CreateIndex
CREATE INDEX "chat_sessions_lastactiveat_idx" ON "public"."chat_sessions"("lastActiveAt");

-- CreateIndex
CREATE INDEX "chat_sessions_projectid_idx" ON "public"."chat_sessions"("projectId");

-- CreateIndex
CREATE INDEX "chat_sessions_userid_idx" ON "public"."chat_sessions"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_projectid_idx" ON "public"."chat_messages"("projectId");

-- CreateIndex
CREATE INDEX "chat_messages_role_idx" ON "public"."chat_messages"("role");

-- CreateIndex
CREATE INDEX "chat_messages_sessionid_timestamp_idx" ON "public"."chat_messages"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "chat_messages_userid_idx" ON "public"."chat_messages"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiRateLimit_tokenId_key" ON "public"."ApiRateLimit"("tokenId");

-- CreateIndex
CREATE INDEX "ApiRateLimit_tokenId_idx" ON "public"."ApiRateLimit"("tokenId");

-- CreateIndex
CREATE INDEX "ApiRateLimit_windowStart_idx" ON "public"."ApiRateLimit"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_token_key" ON "public"."ApiToken"("token");

-- CreateIndex
CREATE INDEX "ApiToken_expiresAt_idx" ON "public"."ApiToken"("expiresAt");

-- CreateIndex
CREATE INDEX "ApiToken_isActive_idx" ON "public"."ApiToken"("isActive");

-- CreateIndex
CREATE INDEX "ApiToken_token_idx" ON "public"."ApiToken"("token");

-- CreateIndex
CREATE INDEX "ApiToken_userId_idx" ON "public"."ApiToken"("userId");

-- CreateIndex
CREATE INDEX "ApiUsageLog_createdAt_idx" ON "public"."ApiUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiUsageLog_endpoint_idx" ON "public"."ApiUsageLog"("endpoint");

-- CreateIndex
CREATE INDEX "ApiUsageLog_statusCode_idx" ON "public"."ApiUsageLog"("statusCode");

-- CreateIndex
CREATE INDEX "ApiUsageLog_tokenId_idx" ON "public"."ApiUsageLog"("tokenId");

-- CreateIndex
CREATE INDEX "ApiUsageLog_userId_idx" ON "public"."ApiUsageLog"("userId");

-- CreateIndex
CREATE INDEX "ApiWebhook_isActive_idx" ON "public"."ApiWebhook"("isActive");

-- CreateIndex
CREATE INDEX "ApiWebhook_userId_idx" ON "public"."ApiWebhook"("userId");

-- CreateIndex
CREATE INDEX "AssistantAnalytics_date_idx" ON "public"."AssistantAnalytics"("date");

-- CreateIndex
CREATE INDEX "AssistantAnalytics_projectId_idx" ON "public"."AssistantAnalytics"("projectId");

-- CreateIndex
CREATE INDEX "AssistantAnalytics_userId_idx" ON "public"."AssistantAnalytics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantAnalytics_userId_projectId_date_key" ON "public"."AssistantAnalytics"("userId", "projectId", "date");

-- CreateIndex
CREATE INDEX "AssistantCommand_projectId_idx" ON "public"."AssistantCommand"("projectId");

-- CreateIndex
CREATE INDEX "AssistantCommand_sessionId_idx" ON "public"."AssistantCommand"("sessionId");

-- CreateIndex
CREATE INDEX "AssistantCommand_status_idx" ON "public"."AssistantCommand"("status");

-- CreateIndex
CREATE INDEX "AssistantCommand_type_idx" ON "public"."AssistantCommand"("type");

-- CreateIndex
CREATE INDEX "AssistantFile_action_idx" ON "public"."AssistantFile"("action");

-- CreateIndex
CREATE INDEX "AssistantFile_projectId_idx" ON "public"."AssistantFile"("projectId");

-- CreateIndex
CREATE INDEX "AssistantFile_sessionId_idx" ON "public"."AssistantFile"("sessionId");

-- CreateIndex
CREATE INDEX "AssistantFile_timestamp_idx" ON "public"."AssistantFile"("timestamp");

-- CreateIndex
CREATE INDEX "AssistantNote_createdAt_idx" ON "public"."AssistantNote"("createdAt");

-- CreateIndex
CREATE INDEX "AssistantNote_userId_idx" ON "public"."AssistantNote"("userId");

-- CreateIndex
CREATE INDEX "AssistantReminder_enabled_idx" ON "public"."AssistantReminder"("enabled");

-- CreateIndex
CREATE INDEX "AssistantReminder_time_idx" ON "public"."AssistantReminder"("time");

-- CreateIndex
CREATE INDEX "AssistantReminder_userId_idx" ON "public"."AssistantReminder"("userId");

-- CreateIndex
CREATE INDEX "AssistantTask_dueDate_idx" ON "public"."AssistantTask"("dueDate");

-- CreateIndex
CREATE INDEX "AssistantTask_status_idx" ON "public"."AssistantTask"("status");

-- CreateIndex
CREATE INDEX "AssistantTask_userId_idx" ON "public"."AssistantTask"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "public"."AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "BackupExport_createdAt_idx" ON "public"."BackupExport"("createdAt");

-- CreateIndex
CREATE INDEX "BackupExport_createdBy_idx" ON "public"."BackupExport"("createdBy");

-- CreateIndex
CREATE INDEX "BackupExport_expiresAt_idx" ON "public"."BackupExport"("expiresAt");

-- CreateIndex
CREATE INDEX "BackupExport_status_idx" ON "public"."BackupExport"("status");

-- CreateIndex
CREATE INDEX "BackupExport_type_idx" ON "public"."BackupExport"("type");

-- CreateIndex
CREATE INDEX "BackupSchedule_createdBy_idx" ON "public"."BackupSchedule"("createdBy");

-- CreateIndex
CREATE INDEX "BackupSchedule_isActive_idx" ON "public"."BackupSchedule"("isActive");

-- CreateIndex
CREATE INDEX "BackupSchedule_nextRunAt_idx" ON "public"."BackupSchedule"("nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "public"."Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "public"."Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "public"."Category"("slug");

-- CreateIndex
CREATE INDEX "ChatConversation_agentId_idx" ON "public"."ChatConversation"("agentId");

-- CreateIndex
CREATE INDEX "ChatConversation_startedAt_idx" ON "public"."ChatConversation"("startedAt");

-- CreateIndex
CREATE INDEX "ChatConversation_status_idx" ON "public"."ChatConversation"("status");

-- CreateIndex
CREATE INDEX "ChatConversation_visitorId_idx" ON "public"."ChatConversation"("visitorId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "public"."ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_idx" ON "public"."ChatMessage"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "public"."Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "public"."Department"("code");

-- CreateIndex
CREATE INDEX "Department_code_idx" ON "public"."Department"("code");

-- CreateIndex
CREATE INDEX "Department_managerId_idx" ON "public"."Department"("managerId");

-- CreateIndex
CREATE INDEX "Department_parentId_idx" ON "public"."Department"("parentId");

-- CreateIndex
CREATE INDEX "EmailCampaign_scheduledAt_idx" ON "public"."EmailCampaign"("scheduledAt");

-- CreateIndex
CREATE INDEX "EmailCampaign_status_idx" ON "public"."EmailCampaign"("status");

-- CreateIndex
CREATE INDEX "EmailCampaignRecipient_campaignId_idx" ON "public"."EmailCampaignRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "EmailCampaignRecipient_status_idx" ON "public"."EmailCampaignRecipient"("status");

-- CreateIndex
CREATE INDEX "EmailCampaignRecipient_subscriberId_idx" ON "public"."EmailCampaignRecipient"("subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCampaignRecipient_campaignId_subscriberId_key" ON "public"."EmailCampaignRecipient"("campaignId", "subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_email_key" ON "public"."EmailSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_confirmToken_key" ON "public"."EmailSubscriber"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_unsubscribeToken_key" ON "public"."EmailSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "EmailSubscriber_email_idx" ON "public"."EmailSubscriber"("email");

-- CreateIndex
CREATE INDEX "EmailSubscriber_status_idx" ON "public"."EmailSubscriber"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Form_slug_key" ON "public"."Form"("slug");

-- CreateIndex
CREATE INDEX "Form_isActive_idx" ON "public"."Form"("isActive");

-- CreateIndex
CREATE INDEX "Form_slug_idx" ON "public"."Form"("slug");

-- CreateIndex
CREATE INDEX "FormSubmission_createdAt_idx" ON "public"."FormSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_idx" ON "public"."FormSubmission"("formId");

-- CreateIndex
CREATE INDEX "FormSubmission_status_idx" ON "public"."FormSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Gallery_slug_key" ON "public"."Gallery"("slug");

-- CreateIndex
CREATE INDEX "Gallery_categoryId_idx" ON "public"."Gallery"("categoryId");

-- CreateIndex
CREATE INDEX "Gallery_slug_idx" ON "public"."Gallery"("slug");

-- CreateIndex
CREATE INDEX "GalleryMedia_galleryId_idx" ON "public"."GalleryMedia"("galleryId");

-- CreateIndex
CREATE INDEX "GalleryMedia_mediaId_idx" ON "public"."GalleryMedia"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryMedia_galleryId_mediaId_key" ON "public"."GalleryMedia"("galleryId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "GitConfig_projectId_key" ON "public"."GitConfig"("projectId");

-- CreateIndex
CREATE INDEX "GitConfig_projectId_idx" ON "public"."GitConfig"("projectId");

-- CreateIndex
CREATE INDEX "GitConfig_syncedAt_idx" ON "public"."GitConfig"("syncedAt");

-- CreateIndex
CREATE INDEX "GitConfigHistory_configId_idx" ON "public"."GitConfigHistory"("configId");

-- CreateIndex
CREATE INDEX "GitConfigHistory_projectId_idx" ON "public"."GitConfigHistory"("projectId");

-- CreateIndex
CREATE INDEX "GitConfigHistory_timestamp_idx" ON "public"."GitConfigHistory"("timestamp");

-- CreateIndex
CREATE INDEX "GitConfigHistory_userId_idx" ON "public"."GitConfigHistory"("userId");

-- CreateIndex
CREATE INDEX "KBAttachment_issueId_idx" ON "public"."KBAttachment"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "KBCategory_name_key" ON "public"."KBCategory"("name");

-- CreateIndex
CREATE INDEX "KBCategory_parentId_idx" ON "public"."KBCategory"("parentId");

-- CreateIndex
CREATE INDEX "KBIssue_assignedTo_idx" ON "public"."KBIssue"("assignedTo");

-- CreateIndex
CREATE INDEX "KBIssue_categoryId_idx" ON "public"."KBIssue"("categoryId");

-- CreateIndex
CREATE INDEX "KBIssue_createdAt_idx" ON "public"."KBIssue"("createdAt");

-- CreateIndex
CREATE INDEX "KBIssue_createdBy_idx" ON "public"."KBIssue"("createdBy");

-- CreateIndex
CREATE INDEX "KBIssue_severity_idx" ON "public"."KBIssue"("severity");

-- CreateIndex
CREATE INDEX "KBIssue_status_idx" ON "public"."KBIssue"("status");

-- CreateIndex
CREATE INDEX "KBIssueRelation_parentIssueId_idx" ON "public"."KBIssueRelation"("parentIssueId");

-- CreateIndex
CREATE INDEX "KBIssueRelation_relatedIssueId_idx" ON "public"."KBIssueRelation"("relatedIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "KBIssueRelation_parentIssueId_relatedIssueId_relationshipTy_key" ON "public"."KBIssueRelation"("parentIssueId", "relatedIssueId", "relationshipType");

-- CreateIndex
CREATE INDEX "KBIssueTag_issueId_idx" ON "public"."KBIssueTag"("issueId");

-- CreateIndex
CREATE INDEX "KBIssueTag_tagId_idx" ON "public"."KBIssueTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "KBIssueTag_issueId_tagId_key" ON "public"."KBIssueTag"("issueId", "tagId");

-- CreateIndex
CREATE INDEX "KBSearchIndex_issueId_idx" ON "public"."KBSearchIndex"("issueId");

-- CreateIndex
CREATE INDEX "KBSearchIndex_lastIndexed_idx" ON "public"."KBSearchIndex"("lastIndexed");

-- CreateIndex
CREATE INDEX "KBSearchIndex_solutionId_idx" ON "public"."KBSearchIndex"("solutionId");

-- CreateIndex
CREATE INDEX "KBSolution_createdBy_idx" ON "public"."KBSolution"("createdBy");

-- CreateIndex
CREATE INDEX "KBSolution_effectivenessScore_idx" ON "public"."KBSolution"("effectivenessScore");

-- CreateIndex
CREATE INDEX "KBSolution_issueId_idx" ON "public"."KBSolution"("issueId");

-- CreateIndex
CREATE INDEX "KBSolutionFeedback_rating_idx" ON "public"."KBSolutionFeedback"("rating");

-- CreateIndex
CREATE INDEX "KBSolutionFeedback_solutionId_idx" ON "public"."KBSolutionFeedback"("solutionId");

-- CreateIndex
CREATE INDEX "KBSolutionFeedback_userId_idx" ON "public"."KBSolutionFeedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KBTag_name_key" ON "public"."KBTag"("name");

-- CreateIndex
CREATE INDEX "KBTag_name_idx" ON "public"."KBTag"("name");

-- CreateIndex
CREATE INDEX "LoginHistory_createdAt_idx" ON "public"."LoginHistory"("createdAt");

-- CreateIndex
CREATE INDEX "LoginHistory_userId_idx" ON "public"."LoginHistory"("userId");

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "public"."Media"("createdAt");

-- CreateIndex
CREATE INDEX "Media_folderId_idx" ON "public"."Media"("folderId");

-- CreateIndex
CREATE INDEX "Media_uploadedBy_idx" ON "public"."Media"("uploadedBy");

-- CreateIndex
CREATE INDEX "MediaFolder_parentId_idx" ON "public"."MediaFolder"("parentId");

-- CreateIndex
CREATE INDEX "MediaFolder_path_idx" ON "public"."MediaFolder"("path");

-- CreateIndex
CREATE INDEX "MediaTag_mediaId_idx" ON "public"."MediaTag"("mediaId");

-- CreateIndex
CREATE INDEX "MediaTag_tagId_idx" ON "public"."MediaTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaTag_mediaId_tagId_key" ON "public"."MediaTag"("mediaId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_code_key" ON "public"."Menu"("code");

-- CreateIndex
CREATE INDEX "Menu_code_idx" ON "public"."Menu"("code");

-- CreateIndex
CREATE INDEX "Menu_location_idx" ON "public"."Menu"("location");

-- CreateIndex
CREATE INDEX "MenuItem_isActive_idx" ON "public"."MenuItem"("isActive");

-- CreateIndex
CREATE INDEX "MenuItem_menuId_idx" ON "public"."MenuItem"("menuId");

-- CreateIndex
CREATE INDEX "MenuItem_order_idx" ON "public"."MenuItem"("order");

-- CreateIndex
CREATE INDEX "MenuItem_parentId_idx" ON "public"."MenuItem"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "public"."Page"("slug");

-- CreateIndex
CREATE INDEX "Page_authorId_idx" ON "public"."Page"("authorId");

-- CreateIndex
CREATE INDEX "Page_language_idx" ON "public"."Page"("language");

-- CreateIndex
CREATE INDEX "Page_publishedAt_idx" ON "public"."Page"("publishedAt");

-- CreateIndex
CREATE INDEX "Page_slug_idx" ON "public"."Page"("slug");

-- CreateIndex
CREATE INDEX "Page_status_idx" ON "public"."Page"("status");

-- CreateIndex
CREATE INDEX "PageComponent_pageId_order_idx" ON "public"."PageComponent"("pageId", "order");

-- CreateIndex
CREATE INDEX "PageComponent_parentId_idx" ON "public"."PageComponent"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "PageTemplate_code_key" ON "public"."PageTemplate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "public"."PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_expires_idx" ON "public"."PasswordReset"("expires");

-- CreateIndex
CREATE INDEX "PasswordReset_token_idx" ON "public"."PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_userId_idx" ON "public"."PasswordReset"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "public"."Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_code_idx" ON "public"."Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_isActive_idx" ON "public"."Permission"("isActive");

-- CreateIndex
CREATE INDEX "Permission_resource_idx" ON "public"."Permission"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_scope_key" ON "public"."Permission"("resource", "action", "scope");

-- CreateIndex
CREATE INDEX "Portfolio_isPublic_idx" ON "public"."Portfolio"("isPublic");

-- CreateIndex
CREATE INDEX "Portfolio_userId_idx" ON "public"."Portfolio"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_userId_name_key" ON "public"."Portfolio"("userId", "name");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_date_idx" ON "public"."PortfolioSnapshot"("date");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_portfolioId_idx" ON "public"."PortfolioSnapshot"("portfolioId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshot_portfolioId_date_key" ON "public"."PortfolioSnapshot"("portfolioId", "date");

-- CreateIndex
CREATE INDEX "Position_portfolioId_idx" ON "public"."Position"("portfolioId");

-- CreateIndex
CREATE INDEX "Position_stockId_idx" ON "public"."Position"("stockId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_portfolioId_stockId_key" ON "public"."Position"("portfolioId", "stockId");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "public"."Post"("slug");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "public"."Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_categoryId_idx" ON "public"."Post"("categoryId");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "public"."Post"("publishedAt");

-- CreateIndex
CREATE INDEX "Post_slug_idx" ON "public"."Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "public"."Post"("status");

-- CreateIndex
CREATE INDEX "PostMedia_mediaId_idx" ON "public"."PostMedia"("mediaId");

-- CreateIndex
CREATE INDEX "PostMedia_postId_idx" ON "public"."PostMedia"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostMedia_postId_mediaId_key" ON "public"."PostMedia"("postId", "mediaId");

-- CreateIndex
CREATE INDEX "PostTag_postId_idx" ON "public"."PostTag"("postId");

-- CreateIndex
CREATE INDEX "PostTag_tagId_idx" ON "public"."PostTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "PostTag_postId_tagId_key" ON "public"."PostTag"("postId", "tagId");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "public"."Project"("createdAt");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "public"."Project"("name");

-- CreateIndex
CREATE INDEX "ProjectPreferences_userId_isPinned_idx" ON "public"."ProjectPreferences"("userId", "isPinned");

-- CreateIndex
CREATE INDEX "ProjectPreferences_userId_lastAccessedAt_idx" ON "public"."ProjectPreferences"("userId", "lastAccessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPreferences_userId_projectId_key" ON "public"."ProjectPreferences"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStatusCache_projectId_key" ON "public"."ProjectStatusCache"("projectId");

-- CreateIndex
CREATE INDEX "ProjectStatusCache_lastUpdatedAt_idx" ON "public"."ProjectStatusCache"("lastUpdatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "public"."Role"("code");

-- CreateIndex
CREATE INDEX "Role_code_idx" ON "public"."Role"("code");

-- CreateIndex
CREATE INDEX "Role_isActive_idx" ON "public"."Role"("isActive");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "public"."RolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "public"."RolePermission"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "public"."RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_expires_idx" ON "public"."Session"("expires");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_symbol_key" ON "public"."Stock"("symbol");

-- CreateIndex
CREATE INDEX "Stock_sector_idx" ON "public"."Stock"("sector");

-- CreateIndex
CREATE INDEX "Stock_symbol_idx" ON "public"."Stock"("symbol");

-- CreateIndex
CREATE INDEX "StockPriceHistory_date_idx" ON "public"."StockPriceHistory"("date");

-- CreateIndex
CREATE INDEX "StockPriceHistory_stockId_idx" ON "public"."StockPriceHistory"("stockId");

-- CreateIndex
CREATE UNIQUE INDEX "StockPriceHistory_stockId_date_key" ON "public"."StockPriceHistory"("stockId", "date");

-- CreateIndex
CREATE INDEX "SubscriberTag_subscriberId_idx" ON "public"."SubscriberTag"("subscriberId");

-- CreateIndex
CREATE INDEX "SubscriberTag_tagId_idx" ON "public"."SubscriberTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriberTag_subscriberId_tagId_key" ON "public"."SubscriberTag"("subscriberId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Survey_slug_key" ON "public"."Survey"("slug");

-- CreateIndex
CREATE INDEX "Survey_slug_idx" ON "public"."Survey"("slug");

-- CreateIndex
CREATE INDEX "Survey_status_idx" ON "public"."Survey"("status");

-- CreateIndex
CREATE INDEX "SurveyResponse_respondentId_idx" ON "public"."SurveyResponse"("respondentId");

-- CreateIndex
CREATE INDEX "SurveyResponse_submittedAt_idx" ON "public"."SurveyResponse"("submittedAt");

-- CreateIndex
CREATE INDEX "SurveyResponse_surveyId_idx" ON "public"."SurveyResponse"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "public"."SystemConfig"("key");

-- CreateIndex
CREATE INDEX "SystemConfig_category_idx" ON "public"."SystemConfig"("category");

-- CreateIndex
CREATE INDEX "SystemConfig_key_idx" ON "public"."SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "public"."Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "public"."Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "public"."Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_slug_idx" ON "public"."Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_usageCount_idx" ON "public"."Tag"("usageCount");

-- CreateIndex
CREATE UNIQUE INDEX "Team_code_key" ON "public"."Team"("code");

-- CreateIndex
CREATE INDEX "Team_code_idx" ON "public"."Team"("code");

-- CreateIndex
CREATE INDEX "Team_leaderId_idx" ON "public"."Team"("leaderId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "public"."TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "public"."TeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "public"."TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "TerminalAnalytics_date_idx" ON "public"."TerminalAnalytics"("date");

-- CreateIndex
CREATE INDEX "TerminalAnalytics_userId_idx" ON "public"."TerminalAnalytics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TerminalAnalytics_userId_date_key" ON "public"."TerminalAnalytics"("userId", "date");

-- CreateIndex
CREATE INDEX "TerminalCommand_projectId_idx" ON "public"."TerminalCommand"("projectId");

-- CreateIndex
CREATE INDEX "TerminalCommand_sessionId_idx" ON "public"."TerminalCommand"("sessionId");

-- CreateIndex
CREATE INDEX "TerminalCommand_timestamp_idx" ON "public"."TerminalCommand"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "TerminalCommandPattern_pattern_key" ON "public"."TerminalCommandPattern"("pattern");

-- CreateIndex
CREATE INDEX "TerminalCommandPattern_category_idx" ON "public"."TerminalCommandPattern"("category");

-- CreateIndex
CREATE INDEX "TerminalCommandPattern_frequency_idx" ON "public"."TerminalCommandPattern"("frequency");

-- CreateIndex
CREATE INDEX "TerminalLog_sessionId_sequence_idx" ON "public"."TerminalLog"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "TerminalLog_timestamp_idx" ON "public"."TerminalLog"("timestamp");

-- CreateIndex
CREATE INDEX "TerminalLog_type_idx" ON "public"."TerminalLog"("type");

-- CreateIndex
CREATE INDEX "TerminalLog_userId_idx" ON "public"."TerminalLog"("userId");

-- CreateIndex
CREATE INDEX "TerminalSOP_category_idx" ON "public"."TerminalSOP"("category");

-- CreateIndex
CREATE INDEX "TerminalSOP_createdBy_idx" ON "public"."TerminalSOP"("createdBy");

-- CreateIndex
CREATE INDEX "TerminalSOP_isActive_idx" ON "public"."TerminalSOP"("isActive");

-- CreateIndex
CREATE INDEX "TerminalSession_active_idx" ON "public"."TerminalSession"("active");

-- CreateIndex
CREATE INDEX "TerminalSession_projectId_idx" ON "public"."TerminalSession"("projectId");

-- CreateIndex
CREATE INDEX "TerminalSession_startedAt_idx" ON "public"."TerminalSession"("startedAt");

-- CreateIndex
CREATE INDEX "TerminalSession_status_idx" ON "public"."TerminalSession"("status");

-- CreateIndex
CREATE INDEX "TerminalSession_type_idx" ON "public"."TerminalSession"("type");

-- CreateIndex
CREATE INDEX "TerminalSession_userId_idx" ON "public"."TerminalSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TerminalSessionState_sessionId_key" ON "public"."TerminalSessionState"("sessionId");

-- CreateIndex
CREATE INDEX "TerminalSessionState_projectId_idx" ON "public"."TerminalSessionState"("projectId");

-- CreateIndex
CREATE INDEX "TerminalSessionState_resumedAt_idx" ON "public"."TerminalSessionState"("resumedAt");

-- CreateIndex
CREATE INDEX "TerminalSessionState_suspendedAt_idx" ON "public"."TerminalSessionState"("suspendedAt");

-- CreateIndex
CREATE INDEX "TerminalShortcut_isGlobal_idx" ON "public"."TerminalShortcut"("isGlobal");

-- CreateIndex
CREATE INDEX "TerminalShortcut_userId_idx" ON "public"."TerminalShortcut"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TerminalShortcut_userId_alias_key" ON "public"."TerminalShortcut"("userId", "alias");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeConfig_name_key" ON "public"."ThemeConfig"("name");

-- CreateIndex
CREATE INDEX "Trade_executedAt_idx" ON "public"."Trade"("executedAt");

-- CreateIndex
CREATE INDEX "Trade_portfolioId_idx" ON "public"."Trade"("portfolioId");

-- CreateIndex
CREATE INDEX "Trade_stockId_idx" ON "public"."Trade"("stockId");

-- CreateIndex
CREATE INDEX "Trade_type_idx" ON "public"."Trade"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_key_key" ON "public"."Translation"("key");

-- CreateIndex
CREATE INDEX "Translation_locale_idx" ON "public"."Translation"("locale");

-- CreateIndex
CREATE INDEX "Translation_namespace_idx" ON "public"."Translation"("namespace");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_key_locale_namespace_key" ON "public"."Translation"("key", "locale", "namespace");

-- CreateIndex
CREATE INDEX "UserActivity_action_idx" ON "public"."UserActivity"("action");

-- CreateIndex
CREATE INDEX "UserActivity_createdAt_idx" ON "public"."UserActivity"("createdAt");

-- CreateIndex
CREATE INDEX "UserActivity_userId_idx" ON "public"."UserActivity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserApiKey_key_key" ON "public"."UserApiKey"("key");

-- CreateIndex
CREATE INDEX "UserApiKey_isActive_idx" ON "public"."UserApiKey"("isActive");

-- CreateIndex
CREATE INDEX "UserApiKey_key_idx" ON "public"."UserApiKey"("key");

-- CreateIndex
CREATE INDEX "UserApiKey_userId_idx" ON "public"."UserApiKey"("userId");

-- CreateIndex
CREATE INDEX "UserConfig_category_idx" ON "public"."UserConfig"("category");

-- CreateIndex
CREATE INDEX "UserConfig_userId_idx" ON "public"."UserConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConfig_userId_key_key" ON "public"."UserConfig"("userId", "key");

-- CreateIndex
CREATE INDEX "UserDepartment_departmentId_idx" ON "public"."UserDepartment"("departmentId");

-- CreateIndex
CREATE INDEX "UserDepartment_userId_idx" ON "public"."UserDepartment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDepartment_userId_departmentId_key" ON "public"."UserDepartment"("userId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_deviceId_key" ON "public"."UserDevice"("deviceId");

-- CreateIndex
CREATE INDEX "UserDevice_deviceId_idx" ON "public"."UserDevice"("deviceId");

-- CreateIndex
CREATE INDEX "UserDevice_lastActive_idx" ON "public"."UserDevice"("lastActive");

-- CreateIndex
CREATE INDEX "UserDevice_userId_idx" ON "public"."UserDevice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvitation_token_key" ON "public"."UserInvitation"("token");

-- CreateIndex
CREATE INDEX "UserInvitation_email_idx" ON "public"."UserInvitation"("email");

-- CreateIndex
CREATE INDEX "UserInvitation_expiresAt_idx" ON "public"."UserInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "UserInvitation_status_idx" ON "public"."UserInvitation"("status");

-- CreateIndex
CREATE INDEX "UserInvitation_token_idx" ON "public"."UserInvitation"("token");

-- CreateIndex
CREATE INDEX "UserNotification_isRead_idx" ON "public"."UserNotification"("isRead");

-- CreateIndex
CREATE INDEX "UserNotification_sentAt_idx" ON "public"."UserNotification"("sentAt");

-- CreateIndex
CREATE INDEX "UserNotification_userId_idx" ON "public"."UserNotification"("userId");

-- CreateIndex
CREATE INDEX "UserPreference_category_idx" ON "public"."UserPreference"("category");

-- CreateIndex
CREATE INDEX "UserPreference_userId_idx" ON "public"."UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_category_key_key" ON "public"."UserPreference"("userId", "category", "key");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "public"."UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_userId_idx" ON "public"."UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserRole_isActive_idx" ON "public"."UserRole"("isActive");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "public"."UserRole"("roleId");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "public"."UserRole"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "public"."UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSidebarSettings_userId_key" ON "public"."UserSidebarSettings"("userId");

-- CreateIndex
CREATE INDEX "Watchlist_userId_idx" ON "public"."Watchlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_userId_name_key" ON "public"."Watchlist"("userId", "name");

-- CreateIndex
CREATE INDEX "WatchlistStock_stockId_idx" ON "public"."WatchlistStock"("stockId");

-- CreateIndex
CREATE INDEX "WatchlistStock_watchlistId_idx" ON "public"."WatchlistStock"("watchlistId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistStock_watchlistId_stockId_key" ON "public"."WatchlistStock"("watchlistId", "stockId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalCommand_projectId_idx" ON "public"."WorkspaceTerminalCommand"("projectId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalCommand_sessionId_idx" ON "public"."WorkspaceTerminalCommand"("sessionId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalCommand_timestamp_idx" ON "public"."WorkspaceTerminalCommand"("timestamp");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalCommand_userId_idx" ON "public"."WorkspaceTerminalCommand"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalLog_projectId_idx" ON "public"."WorkspaceTerminalLog"("projectId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalLog_sessionId_sequence_idx" ON "public"."WorkspaceTerminalLog"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalLog_timestamp_idx" ON "public"."WorkspaceTerminalLog"("timestamp");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalLog_type_idx" ON "public"."WorkspaceTerminalLog"("type");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalLog_userId_idx" ON "public"."WorkspaceTerminalLog"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalSession_active_idx" ON "public"."WorkspaceTerminalSession"("active");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalSession_projectId_idx" ON "public"."WorkspaceTerminalSession"("projectId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalSession_startedAt_idx" ON "public"."WorkspaceTerminalSession"("startedAt");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalSession_userId_idx" ON "public"."WorkspaceTerminalSession"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceTerminalSession_workspaceId_idx" ON "public"."WorkspaceTerminalSession"("workspaceId");

-- CreateIndex
CREATE INDEX "AssistantConversation_folderId_idx" ON "public"."assistant_conversation_legacy"("folderId");

-- CreateIndex
CREATE INDEX "AssistantConversation_sessionId_idx" ON "public"."assistant_conversation_legacy"("sessionId");

-- CreateIndex
CREATE INDEX "AssistantConversation_startedAt_idx" ON "public"."assistant_conversation_legacy"("startedAt");

-- CreateIndex
CREATE INDEX "AssistantConversation_userId_idx" ON "public"."assistant_conversation_legacy"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantConversation_userId_sessionId_key" ON "public"."assistant_conversation_legacy"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "AssistantMessage_conversationId_idx" ON "public"."assistant_message_legacy"("conversationId");

-- CreateIndex
CREATE INDEX "AssistantMessage_createdAt_idx" ON "public"."assistant_message_legacy"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "User_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "User_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "User_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_folders" ADD CONSTRAINT "AssistantFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_sessions" ADD CONSTRAINT "AssistantChatSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_sessions" ADD CONSTRAINT "AssistantChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "AssistantChatMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "AssistantChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "AssistantChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiUsageLog" ADD CONSTRAINT "ApiUsageLog_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "public"."ApiToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiUsageLog" ADD CONSTRAINT "ApiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiWebhook" ADD CONSTRAINT "ApiWebhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantAnalytics" ADD CONSTRAINT "AssistantAnalytics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantAnalytics" ADD CONSTRAINT "AssistantAnalytics_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."chat_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantAnalytics" ADD CONSTRAINT "AssistantAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantCommand" ADD CONSTRAINT "AssistantCommand_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantCommand" ADD CONSTRAINT "AssistantCommand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantFile" ADD CONSTRAINT "AssistantFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantFile" ADD CONSTRAINT "AssistantFile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantNote" ADD CONSTRAINT "AssistantNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantReminder" ADD CONSTRAINT "AssistantReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantTask" ADD CONSTRAINT "AssistantTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BackupExport" ADD CONSTRAINT "BackupExport_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BackupSchedule" ADD CONSTRAINT "BackupSchedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatConversation" ADD CONSTRAINT "ChatConversation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailCampaign" ADD CONSTRAINT "EmailCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "public"."EmailSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Form" ADD CONSTRAINT "Form_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormSubmission" ADD CONSTRAINT "FormSubmission_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Gallery" ADD CONSTRAINT "Gallery_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryMedia" ADD CONSTRAINT "GalleryMedia_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "public"."Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GalleryMedia" ADD CONSTRAINT "GalleryMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "public"."Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GitConfig" ADD CONSTRAINT "GitConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GitConfigHistory" ADD CONSTRAINT "GitConfigHistory_configId_fkey" FOREIGN KEY ("configId") REFERENCES "public"."GitConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GitConfigHistory" ADD CONSTRAINT "GitConfigHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GitConfigHistory" ADD CONSTRAINT "GitConfigHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBAttachment" ADD CONSTRAINT "KBAttachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBAttachment" ADD CONSTRAINT "KBAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBCategory" ADD CONSTRAINT "KBCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."KBCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssue" ADD CONSTRAINT "KBIssue_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssue" ADD CONSTRAINT "KBIssue_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."KBCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssue" ADD CONSTRAINT "KBIssue_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssueRelation" ADD CONSTRAINT "KBIssueRelation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssueRelation" ADD CONSTRAINT "KBIssueRelation_parentIssueId_fkey" FOREIGN KEY ("parentIssueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssueRelation" ADD CONSTRAINT "KBIssueRelation_relatedIssueId_fkey" FOREIGN KEY ("relatedIssueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssueTag" ADD CONSTRAINT "KBIssueTag_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssueTag" ADD CONSTRAINT "KBIssueTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."KBTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSearchIndex" ADD CONSTRAINT "KBSearchIndex_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSearchIndex" ADD CONSTRAINT "KBSearchIndex_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "public"."KBSolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSolution" ADD CONSTRAINT "KBSolution_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSolution" ADD CONSTRAINT "KBSolution_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSolutionFeedback" ADD CONSTRAINT "KBSolutionFeedback_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "public"."KBSolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSolutionFeedback" ADD CONSTRAINT "KBSolutionFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "public"."MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaFolder" ADD CONSTRAINT "MediaFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaTag" ADD CONSTRAINT "MediaTag_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "public"."Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaTag" ADD CONSTRAINT "MediaTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItem" ADD CONSTRAINT "MenuItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItem" ADD CONSTRAINT "MenuItem_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItem" ADD CONSTRAINT "MenuItem_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Page" ADD CONSTRAINT "Page_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Page" ADD CONSTRAINT "Page_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Page" ADD CONSTRAINT "Page_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."PageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PageComponent" ADD CONSTRAINT "PageComponent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PageComponent" ADD CONSTRAINT "PageComponent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."PageComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Position" ADD CONSTRAINT "Position_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Position" ADD CONSTRAINT "Position_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "public"."Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostMedia" ADD CONSTRAINT "PostMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "public"."Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostTag" ADD CONSTRAINT "PostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectPreferences" ADD CONSTRAINT "ProjectPreferences_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectPreferences" ADD CONSTRAINT "ProjectPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectStatusCache" ADD CONSTRAINT "ProjectStatusCache_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockPriceHistory" ADD CONSTRAINT "StockPriceHistory_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "public"."Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriberTag" ADD CONSTRAINT "SubscriberTag_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "public"."EmailSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriberTag" ADD CONSTRAINT "SubscriberTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Survey" ADD CONSTRAINT "Survey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tag" ADD CONSTRAINT "Tag_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerminalAnalytics" ADD CONSTRAINT "TerminalAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerminalCommand" ADD CONSTRAINT "TerminalCommand_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerminalCommand" ADD CONSTRAINT "TerminalCommand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."TerminalSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerminalLog" ADD CONSTRAINT "TerminalLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."TerminalSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerminalLog" ADD CONSTRAINT "TerminalLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerminalSOP" ADD CONSTRAINT "TerminalSOP_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerminalSession" ADD CONSTRAINT "TerminalSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerminalSession" ADD CONSTRAINT "TerminalSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerminalSessionState" ADD CONSTRAINT "TerminalSessionState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."TerminalSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerminalShortcut" ADD CONSTRAINT "TerminalShortcut_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThemeConfig" ADD CONSTRAINT "ThemeConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "public"."Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserApiKey" ADD CONSTRAINT "UserApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserConfig" ADD CONSTRAINT "UserConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDepartment" ADD CONSTRAINT "UserDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDepartment" ADD CONSTRAINT "UserDepartment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserInvitation" ADD CONSTRAINT "UserInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSidebarSettings" ADD CONSTRAINT "UserSidebarSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WatchlistStock" ADD CONSTRAINT "WatchlistStock_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "public"."Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WatchlistStock" ADD CONSTRAINT "WatchlistStock_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "public"."Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalCommand" ADD CONSTRAINT "WorkspaceTerminalCommand_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalCommand" ADD CONSTRAINT "WorkspaceTerminalCommand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."WorkspaceTerminalSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalCommand" ADD CONSTRAINT "WorkspaceTerminalCommand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalLog" ADD CONSTRAINT "WorkspaceTerminalLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalLog" ADD CONSTRAINT "WorkspaceTerminalLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."WorkspaceTerminalSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalLog" ADD CONSTRAINT "WorkspaceTerminalLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalSession" ADD CONSTRAINT "WorkspaceTerminalSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceTerminalSession" ADD CONSTRAINT "WorkspaceTerminalSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_conversation_legacy" ADD CONSTRAINT "AssistantConversation_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "public"."chat_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_conversation_legacy" ADD CONSTRAINT "AssistantConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_message_legacy" ADD CONSTRAINT "AssistantMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."assistant_conversation_legacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."usage_tracking_user_timestamp_idx" RENAME TO "usage_tracking_user_id_timestamp_idx";
