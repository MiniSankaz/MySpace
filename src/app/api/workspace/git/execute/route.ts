import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/core/database/prisma";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Whitelist of safe git commands
const SAFE_COMMANDS = [
  "status",
  "log",
  "diff",
  "branch",
  "checkout",
  "pull",
  "push",
  "fetch",
  "stash",
  "add",
  "commit",
  "merge",
  "reset",
  "rebase",
  "cherry-pick",
  "tag",
  "show",
  "remote",
  "config",
];

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, command } = body;

    if (!projectId || !command) {
      return NextResponse.json(
        { error: "Project ID and command required" },
        { status: 400 },
      );
    }

    // Validate command is safe
    const commandParts = command.trim().split(/\s+/);
    const gitCommand = commandParts[0];

    if (!SAFE_COMMANDS.includes(gitCommand)) {
      return NextResponse.json(
        { error: `Command '${gitCommand}' is not allowed` },
        { status: 403 },
      );
    }

    // Get project from database
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Execute git command
    try {
      const { stdout, stderr } = await execAsync(`git ${command}`, {
        cwd: project.path,
        maxBuffer: 1024 * 1024, // 1MB buffer
      });

      return NextResponse.json({
        success: true,
        output: stdout || stderr,
        command: `git ${command}`,
      });
    } catch (execError: any) {
      // Git commands often return non-zero exit codes for non-errors
      // Check if there's actual output
      if (execError.stdout || execError.stderr) {
        return NextResponse.json({
          success: false,
          output: execError.stdout || execError.stderr,
          command: `git ${command}`,
          exitCode: execError.code,
        });
      }

      throw execError;
    }
  } catch (error) {
    console.error("Failed to execute git command:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute command",
      },
      { status: 500 },
    );
  }
}
