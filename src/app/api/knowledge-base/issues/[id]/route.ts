import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/middleware/auth";
import { IssueService } from "@/modules/knowledge-base/services/issue.service";
import { logger } from "@/core/utils/logger";

const updateIssueSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
  status: z
    .enum(["open", "in_progress", "resolved", "closed", "reopened"])
    .optional(),
  categoryId: z.string().uuid().optional(),
  environment: z.string().optional(),
  affectedComponents: z.array(z.string()).optional(),
  reproductionSteps: z.string().optional(),
  businessImpact: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

const issueService = new IssueService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const issue = await issueService.findById(id);

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    return NextResponse.json(issue);
  } catch (error) {
    logger.error("Failed to get issue", error);
    return NextResponse.json({ error: "Failed to get issue" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateIssueSchema.parse(body);

    const issue = await issueService.update(id, validatedData, user.id);

    return NextResponse.json(issue);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    logger.error("Failed to update issue", error);
    return NextResponse.json(
      { error: "Failed to update issue" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await issueService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete issue", error);
    return NextResponse.json(
      { error: "Failed to delete issue" },
      { status: 500 },
    );
  }
}
