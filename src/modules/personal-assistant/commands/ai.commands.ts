import { Command, AssistantContext, AssistantResponse } from "../types";
import { ClaudeDirectService } from "@/services/claude-direct.service";

const claudeAI = ClaudeDirectService.getInstance();
// Initialize once on module load
claudeAI.initialize().catch(console.error);

export const aiCodeCommand: Command = {
  name: "ai.code",
  description: "Generate code with AI assistance",
  aliases: ["code", "generate"],
  parameters: [
    {
      name: "requirements",
      type: "string",
      required: true,
      description: "Code requirements or description",
    },
  ],
  handler: async (
    context: AssistantContext,
    args: Record<string, any>,
  ): Promise<AssistantResponse> => {
    const { requirements } = args;

    if (!requirements) {
      return {
        message:
          "กรุณาระบุความต้องการสำหรับโค้ด ตัวอย่าง: `code function to validate email`",
        suggestions: [
          "code React component for login form",
          "code API endpoint for user authentication",
          "code utility function for date formatting",
        ],
      };
    }

    try {
      const codePrompt = `Please generate code based on these requirements: ${requirements}. 
Provide clean, well-documented code with explanations.`;

      const response = await claudeAI.sendMessage(codePrompt, [
        {
          role: "system",
          content:
            "You are a code generation assistant. Generate clean, well-documented code based on user requirements. Include comments and best practices.",
        },
      ]);

      return {
        message: `🤖 **AI Generated Code:**\n\n${response.content}`,
        suggestions: [
          "ai explain - อธิบายโค้ดนี้",
          "ai improve - ปรับปรุงโค้ด",
          "task add - บันทึกเป็นงาน",
        ],
        data: {
          source: "claude-direct",
          code: response.content,
        },
      };
    } catch (error) {
      return {
        message: "❌ ไม่สามารถสร้างโค้ดได้ในขณะนี้ กรุณาลองใหม่",
        suggestions: ["help", "code simple function"],
      };
    }
  },
};

export const aiExplainCommand: Command = {
  name: "ai.explain",
  description: "Explain code or concept with AI",
  aliases: ["explain", "what"],
  parameters: [
    {
      name: "content",
      type: "string",
      required: true,
      description: "Code or concept to explain",
    },
  ],
  handler: async (
    context: AssistantContext,
    args: Record<string, any>,
  ): Promise<AssistantResponse> => {
    const { content } = args;

    if (!content) {
      return {
        message: "กรุณาระบุโค้ดหรือแนวคิดที่ต้องการให้อธิบาย",
        suggestions: [
          "explain async/await in JavaScript",
          "explain React hooks",
          "explain REST API",
        ],
      };
    }

    try {
      const explainPrompt = `Please explain this code or concept in detail: ${content}. 
Provide clear explanations with examples if possible.`;

      const response = await claudeAI.sendMessage(explainPrompt, [
        {
          role: "system",
          content:
            "You are a helpful code explanation assistant. Explain code and concepts clearly with examples and best practices.",
        },
      ]);

      return {
        message: `📚 **AI Explanation:**\n\n${response.content}`,
        suggestions: [
          "ai code - สร้างโค้ดตัวอย่าง",
          "note create - บันทึกคำอธิบาย",
          "ai debug - ช่วย debug",
        ],
        data: {
          source: "claude-direct",
          explanation: response.content,
        },
      };
    } catch (error) {
      return {
        message: "❌ ไม่สามารถอธิบายได้ในขณะนี้ กรุณาลองใหม่",
        suggestions: ["help", "explain simple concept"],
      };
    }
  },
};

export const aiDebugCommand: Command = {
  name: "ai.debug",
  description: "Debug code with AI assistance",
  aliases: ["debug", "fix"],
  parameters: [
    {
      name: "problem",
      type: "string",
      required: true,
      description: "Code and error description",
    },
  ],
  handler: async (
    context: AssistantContext,
    args: Record<string, any>,
  ): Promise<AssistantResponse> => {
    const { problem } = args;

    if (!problem) {
      return {
        message: "กรุณาระบุโค้ดและข้อผิดพลาดที่พบ",
        suggestions: [
          "debug TypeError: Cannot read property",
          "fix undefined is not a function",
          "debug async await not working",
        ],
      };
    }

    try {
      // Extract code and error from problem description
      const parts = problem.split("error:");
      const code = parts[0] || problem;
      const error = parts[1] || "Unknown error";

      const response = await claudeAI.debugCode(code, error);

      return {
        message: `🔧 **AI Debug Solution:**\n\n${response.content}`,
        suggestions: [
          "ai explain - อธิบายการแก้ไข",
          "task add - เพิ่มเป็นงานที่ต้องทำ",
          "note create - บันทึกวิธีแก้ไข",
        ],
        data: {
          source: "claude-ai",
          model: response.model,
          solution: response.content,
        },
      };
    } catch (error) {
      return {
        message: "❌ ไม่สามารถวิเคราะห์ปัญหาได้ในขณะนี้",
        suggestions: ["help", "debug with more details"],
      };
    }
  },
};

export const aiAnalyzeCommand: Command = {
  name: "ai.analyze",
  description: "Analyze code quality and suggest improvements",
  aliases: ["analyze", "review"],
  parameters: [
    {
      name: "code",
      type: "string",
      required: true,
      description: "Code to analyze",
    },
  ],
  handler: async (
    context: AssistantContext,
    args: Record<string, any>,
  ): Promise<AssistantResponse> => {
    const { code } = args;

    if (!code) {
      return {
        message: "กรุณาระบุโค้ดที่ต้องการวิเคราะห์",
        suggestions: [
          "analyze function code",
          "review React component",
          "analyze API endpoint",
        ],
      };
    }

    try {
      const response = await claudeAI.analyzeCode(code);

      return {
        message: `🔍 **AI Code Analysis:**\n\n${response.content}`,
        suggestions: [
          "ai improve - ปรับปรุงตามคำแนะนำ",
          "task add - เพิ่มเป็นงานปรับปรุง",
          "note create - บันทึกข้อเสนอแนะ",
        ],
        data: {
          source: "claude-ai",
          model: response.model,
          analysis: response.content,
        },
      };
    } catch (error) {
      return {
        message: "❌ ไม่สามารถวิเคราะห์โค้ดได้ในขณะนี้",
        suggestions: ["help", "analyze simpler code"],
      };
    }
  },
};

export const aiChatCommand: Command = {
  name: "ai.chat",
  description: "Chat directly with Claude AI",
  aliases: ["ai", "claude", "ask"],
  parameters: [
    {
      name: "message",
      type: "string",
      required: true,
      description: "Message to Claude",
    },
  ],
  handler: async (
    context: AssistantContext,
    args: Record<string, any>,
  ): Promise<AssistantResponse> => {
    const { message } = args;

    if (!message) {
      return {
        message:
          "💬 พิมพ์ข้อความเพื่อคุยกับ Claude AI\nตัวอย่าง: `ai สวัสดี Claude`",
        suggestions: [
          "ai how to learn TypeScript",
          "ai explain React vs Vue",
          "ai best practices for API design",
        ],
      };
    }

    try {
      const response = await claudeAI.sendMessage(message);

      return {
        message: `🤖 **Claude AI:**\n\n${response.content}`,
        suggestions: [
          "ai follow up question",
          "note create - บันทึกคำตอบ",
          "task add - เพิ่มเป็นงาน",
        ],
        data: {
          source: "claude-ai",
          model: response.model,
          response: response.content,
        },
      };
    } catch (error) {
      return {
        message: "❌ ไม่สามารถติดต่อ Claude AI ได้ในขณะนี้",
        suggestions: ["help", "ai status"],
      };
    }
  },
};
