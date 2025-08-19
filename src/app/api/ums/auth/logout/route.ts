import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/modules/ums/services/auth.service";
import { verifyAuth } from "@/modules/ums/middleware/auth";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get refresh token from cookie
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // Logout user
    await authService.logout(authResult.userId!, refreshToken);

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    response.cookies.delete("refreshToken");

    return response;
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Logout failed",
      },
      { status: 500 },
    );
  }
}
