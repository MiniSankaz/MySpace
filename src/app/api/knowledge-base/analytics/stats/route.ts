import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/middleware/auth";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/utils/logger";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get issue statistics
    const [total, open, resolved, critical] = await Promise.all([
      prisma.kBIssue.count(),
      prisma.kBIssue.count({
        where: { status: { in: ["open", "in_progress"] } },
      }),
      prisma.kBIssue.count({
        where: { status: "resolved" },
      }),
      prisma.kBIssue.count({
        where: {
          severity: "critical",
          status: { not: "resolved" },
        },
      }),
    ]);

    // Get recent activity metrics
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const [weeklyIssues, weeklySolutions] = await Promise.all([
      prisma.kBIssue.count({
        where: { createdAt: { gte: lastWeek } },
      }),
      prisma.kBSolution.count({
        where: { createdAt: { gte: lastWeek } },
      }),
    ]);

    // Get top contributors
    const topContributors = await prisma.kBSolution.groupBy({
      by: ["createdBy"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    // Get user details for top contributors
    const contributorIds = topContributors.map((c) => c.createdBy);
    const users = await prisma.user.findMany({
      where: { id: { in: contributorIds } },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    const userMap = users.reduce(
      (acc, user) => {
        acc[user.id] = user;
        return acc;
      },
      {} as Record<string, any>,
    );

    const contributors = topContributors.map((c) => ({
      user: userMap[c.createdBy],
      solutionCount: c._count.id,
    }));

    return NextResponse.json({
      total,
      open,
      resolved,
      critical,
      weeklyMetrics: {
        issues: weeklyIssues,
        solutions: weeklySolutions,
        avgResolutionHours: 0, // TODO: Calculate actual time
      },
      topContributors: contributors,
      lastUpdated: new Date(),
    });
  } catch (error) {
    logger.error("Failed to get KB stats", error);
    return NextResponse.json(
      { error: "Failed to get statistics" },
      { status: 500 },
    );
  }
}
