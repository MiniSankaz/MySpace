import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class ClaudeDirectOnlyService {
  private static instance: ClaudeDirectOnlyService;

  private constructor() {}

  static getInstance(): ClaudeDirectOnlyService {
    if (!ClaudeDirectOnlyService.instance) {
      ClaudeDirectOnlyService.instance = new ClaudeDirectOnlyService();
    }
    return ClaudeDirectOnlyService.instance;
  }

  async sendToClaude(message: string): Promise<string> {
    try {
      console.log("[Claude Direct] Sending:", message);

      // Escape message for shell
      const escapedMessage = message
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "'\\''")
        .replace(/"/g, '\\"')
        .replace(/\$/g, "\\$")
        .replace(/`/g, "\\`")
        .replace(/\n/g, " ");

      // Send directly to Claude
      const command = `echo "${escapedMessage}" | claude 2>&1`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: 1800000, // 30 minutes
        maxBuffer: 100 * 1024 * 1024, // 100MB
      });

      if (stderr) {
        console.error("[Claude Direct] stderr:", stderr);
      }

      const response = stdout.trim();
      console.log("[Claude Direct] Got response, length:", response.length);

      return response || "No response from Claude";
    } catch (error: any) {
      console.error("[Claude Direct] Error:", error);
      throw error; // Throw error instead of returning fallback
    }
  }
}
