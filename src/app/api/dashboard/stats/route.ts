import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/middleware/auth";
import { dashboardService } from "@/services/dashboard.service";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);

    if (!user) {
      // Use fallback for development if no user is authenticated
      const userId = "user_1754700005019_72fba58a54903c06"; // Default user for development

      // Fetch dashboard stats
      const stats = await dashboardService.getDashboardStats(userId);

      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    // Fetch dashboard stats for authenticated user
    const stats = await dashboardService.getDashboardStats(user.id);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Quick stats endpoint for lightweight dashboard updates
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);

    if (!user) {
      // Use fallback for development if no user is authenticated
      const userId = "user_1754700005019_72fba58a54903c06"; // Default user for development
      const quickStats = await dashboardService.getQuickStats(userId);

      return NextResponse.json({
        success: true,
        data: quickStats,
      });
    }

    const quickStats = await dashboardService.getQuickStats(user.id);

    return NextResponse.json({
      success: true,
      data: quickStats,
    });
  } catch (error) {
    console.error("Quick stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quick stats" },
      { status: 500 },
    );
  }
}
