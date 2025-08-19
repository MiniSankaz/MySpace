import { Command, AssistantContext, AssistantResponse } from "../types";

export const helpCommand: Command = {
  name: "help",
  description: "Show available commands and how to use them",
  aliases: ["?", "commands", "h"],
  handler: async (context: AssistantContext): Promise<AssistantResponse> => {
    const commands = [
      "**📋 Task Management**",
      "• `task add [title]` - Add a new task",
      "• `task list` - Show all tasks",
      "• `task complete [id/title]` - Mark task as complete",
      "",
      "**⏰ Reminders**",
      "• `reminder set [title] at [time]` - Set a reminder",
      "• `reminder list` - Show all reminders",
      "• `reminder delete [id]` - Delete a reminder",
      "",
      "**📝 Notes**",
      "• `note create [content]` - Create a new note",
      "• `note list` - Show all notes",
      "• `note search [keyword]` - Search notes",
      "",
      "**🤖 AI Assistant (Claude)**",
      "• `ai [message]` - Chat with Claude AI",
      "• `code [requirements]` - Generate code with AI",
      "• `explain [concept/code]` - Get AI explanation",
      "• `debug [code+error]` - AI debugging help",
      "• `analyze [code]` - AI code analysis",
      "",
      "**🔧 System**",
      "• `help` - Show this help message",
      "• `clear` - Clear conversation",
      "• `settings` - View and update preferences",
      "",
      "**💡 Tips**",
      '• You can use natural language like "remind me to call John at 3pm"',
      '• Ask coding questions directly: "how to implement auth in Next.js"',
      "• Commands are case-insensitive",
      "• Use shortcuts: `?` for help, `t` for task, `r` for reminder",
    ];

    return {
      message: commands.join("\n"),
      suggestions: [
        "task add Buy groceries",
        "reminder set Meeting at 2pm",
        "note create Project ideas",
        "task list",
        "settings",
      ],
    };
  },
};
