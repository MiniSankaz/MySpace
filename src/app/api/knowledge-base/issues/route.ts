import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/middleware/auth";
import { IssueService } from "@/modules/knowledge-base/services/issue.service";
import { logger } from "@/core/utils/logger";

const createIssueSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
  categoryId: z.string().uuid().optional(),
  environment: z.string().optional(),
  affectedComponents: z.array(z.string()).optional(),
  reproductionSteps: z.string().optional(),
  businessImpact: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const issueService = new IssueService();

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const params = {
      query: searchParams.get("query") || undefined,
      status: searchParams.get("status") as any,
      severity: searchParams.get("severity") as any,
      categoryId: searchParams.get("categoryId") || undefined,
      assignedTo: searchParams.get("assignedTo") || undefined,
      createdBy: searchParams.get("createdBy") || undefined,
      tags: searchParams.get("tags")?.split(",").filter(Boolean),
      fromDate: searchParams.get("fromDate")
        ? new Date(searchParams.get("fromDate")!)
        : undefined,
      toDate: searchParams.get("toDate")
        ? new Date(searchParams.get("toDate")!)
        : undefined,
      limit: parseInt(searchParams.get("limit") || "20"),
      offset: parseInt(searchParams.get("offset") || "0"),
      sortBy: (searchParams.get("sortBy") as any) || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as any) || "desc",
    };

    const result = await issueService.search(params);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to search issues", error);
    return NextResponse.json(
      { error: "Failed to search issues" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createIssueSchema.parse(body);

    const issue = await issueService.create(validatedData, user.id);

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    logger.error("Failed to create issue", error);
    return NextResponse.json(
      { error: "Failed to create issue" },
      { status: 500 },
    );
  }
}
