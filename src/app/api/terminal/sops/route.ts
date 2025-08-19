import { NextRequest, NextResponse } from "next/server";
import { terminalLoggingService } from "@/services/terminal-logging.service";

export async function GET(req: NextRequest) {
  try {
    const sops = await terminalLoggingService.getActiveSOPs();
    return NextResponse.json({ sops });
  } catch (error) {
    console.error("Failed to get SOPs:", error);
    return NextResponse.json(
      { error: "Failed to retrieve SOPs" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      workflow,
      triggers,
      category,
      tags,
      createdBy,
    } = body;

    if (!title || !workflow || !category) {
      return NextResponse.json(
        { error: "title, workflow, and category are required" },
        { status: 400 },
      );
    }

    const sop = await terminalLoggingService.createSOP({
      title,
      description,
      workflow,
      triggers: triggers || {},
      category,
      tags: tags || [],
      createdBy,
    });

    return NextResponse.json({ sop });
  } catch (error) {
    console.error("Failed to create SOP:", error);
    return NextResponse.json(
      { error: "Failed to create SOP" },
      { status: 500 },
    );
  }
}
