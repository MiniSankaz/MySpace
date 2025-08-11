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
CREATE TABLE "public"."KBTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KBTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KBIssueTag" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "KBIssueTag_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."KBSearchIndex" (
    "id" TEXT NOT NULL,
    "issueId" TEXT,
    "solutionId" TEXT,
    "contentVector" TEXT,
    "contentText" TEXT NOT NULL,
    "lastIndexed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KBSearchIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KBIssue_status_idx" ON "public"."KBIssue"("status");

-- CreateIndex
CREATE INDEX "KBIssue_severity_idx" ON "public"."KBIssue"("severity");

-- CreateIndex
CREATE INDEX "KBIssue_categoryId_idx" ON "public"."KBIssue"("categoryId");

-- CreateIndex
CREATE INDEX "KBIssue_createdBy_idx" ON "public"."KBIssue"("createdBy");

-- CreateIndex
CREATE INDEX "KBIssue_assignedTo_idx" ON "public"."KBIssue"("assignedTo");

-- CreateIndex
CREATE INDEX "KBIssue_createdAt_idx" ON "public"."KBIssue"("createdAt");

-- CreateIndex
CREATE INDEX "KBSolution_issueId_idx" ON "public"."KBSolution"("issueId");

-- CreateIndex
CREATE INDEX "KBSolution_createdBy_idx" ON "public"."KBSolution"("createdBy");

-- CreateIndex
CREATE INDEX "KBSolution_effectivenessScore_idx" ON "public"."KBSolution"("effectivenessScore");

-- CreateIndex
CREATE UNIQUE INDEX "KBCategory_name_key" ON "public"."KBCategory"("name");

-- CreateIndex
CREATE INDEX "KBCategory_parentId_idx" ON "public"."KBCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "KBTag_name_key" ON "public"."KBTag"("name");

-- CreateIndex
CREATE INDEX "KBTag_name_idx" ON "public"."KBTag"("name");

-- CreateIndex
CREATE INDEX "KBIssueTag_issueId_idx" ON "public"."KBIssueTag"("issueId");

-- CreateIndex
CREATE INDEX "KBIssueTag_tagId_idx" ON "public"."KBIssueTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "KBIssueTag_issueId_tagId_key" ON "public"."KBIssueTag"("issueId", "tagId");

-- CreateIndex
CREATE INDEX "KBSolutionFeedback_solutionId_idx" ON "public"."KBSolutionFeedback"("solutionId");

-- CreateIndex
CREATE INDEX "KBSolutionFeedback_userId_idx" ON "public"."KBSolutionFeedback"("userId");

-- CreateIndex
CREATE INDEX "KBSolutionFeedback_rating_idx" ON "public"."KBSolutionFeedback"("rating");

-- CreateIndex
CREATE INDEX "KBIssueRelation_parentIssueId_idx" ON "public"."KBIssueRelation"("parentIssueId");

-- CreateIndex
CREATE INDEX "KBIssueRelation_relatedIssueId_idx" ON "public"."KBIssueRelation"("relatedIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "KBIssueRelation_parentIssueId_relatedIssueId_relationshipTy_key" ON "public"."KBIssueRelation"("parentIssueId", "relatedIssueId", "relationshipType");

-- CreateIndex
CREATE INDEX "KBAttachment_issueId_idx" ON "public"."KBAttachment"("issueId");

-- CreateIndex
CREATE INDEX "KBSearchIndex_issueId_idx" ON "public"."KBSearchIndex"("issueId");

-- CreateIndex
CREATE INDEX "KBSearchIndex_solutionId_idx" ON "public"."KBSearchIndex"("solutionId");

-- CreateIndex
CREATE INDEX "KBSearchIndex_lastIndexed_idx" ON "public"."KBSearchIndex"("lastIndexed");

-- AddForeignKey
ALTER TABLE "public"."KBIssue" ADD CONSTRAINT "KBIssue_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."KBCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssue" ADD CONSTRAINT "KBIssue_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssue" ADD CONSTRAINT "KBIssue_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSolution" ADD CONSTRAINT "KBSolution_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSolution" ADD CONSTRAINT "KBSolution_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBCategory" ADD CONSTRAINT "KBCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."KBCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssueTag" ADD CONSTRAINT "KBIssueTag_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssueTag" ADD CONSTRAINT "KBIssueTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."KBTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSolutionFeedback" ADD CONSTRAINT "KBSolutionFeedback_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "public"."KBSolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSolutionFeedback" ADD CONSTRAINT "KBSolutionFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssueRelation" ADD CONSTRAINT "KBIssueRelation_parentIssueId_fkey" FOREIGN KEY ("parentIssueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssueRelation" ADD CONSTRAINT "KBIssueRelation_relatedIssueId_fkey" FOREIGN KEY ("relatedIssueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBIssueRelation" ADD CONSTRAINT "KBIssueRelation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBAttachment" ADD CONSTRAINT "KBAttachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBAttachment" ADD CONSTRAINT "KBAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSearchIndex" ADD CONSTRAINT "KBSearchIndex_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "public"."KBIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KBSearchIndex" ADD CONSTRAINT "KBSearchIndex_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "public"."KBSolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
