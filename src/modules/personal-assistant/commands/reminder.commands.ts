import {
  Command,
  AssistantContext,
  AssistantResponse,
  Reminder,
} from "../types";

export const reminderSetCommand: Command = {
  name: "reminder.set",
  description: "Set a new reminder",
  aliases: ["remind", "r.set"],
  parameters: [
    {
      name: "title",
      type: "string",
      required: true,
      description: "Reminder title",
    },
    {
      name: "time",
      type: "date",
      required: true,
      description: "Time for the reminder",
    },
  ],
  handler: async (
    context: AssistantContext,
    args: Record<string, any>,
  ): Promise<AssistantResponse> => {
    const { title, time } = args;

    if (!title) {
      return {
        message:
          "กรุณาระบุหัวข้อการเตือน ตัวอย่าง: `reminder set ประชุมทีม at 2pm`",
        suggestions: [
          "reminder set ประชุม at 2pm",
          "remind me อาหารเที่ยง in 30 minutes",
        ],
      };
    }

    const reminderTime = time || new Date(Date.now() + 3600000); // Default 1 hour from now

    const newReminder: Reminder = {
      id: `reminder-${Date.now()}`,
      title,
      time: reminderTime,
      enabled: true,
      createdAt: new Date(),
    };

    if (!context.userData) {
      return {
        message: "ไม่สามารถเข้าถึงข้อมูลผู้ใช้ได้",
        suggestions: ["help", "reminder list"],
      };
    }

    context.userData.reminders.push(newReminder);

    const timeStr = reminderTime.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      message: `⏰ ตั้งเตือน: "${title}" เวลา ${timeStr}`,
      suggestions: ["reminder list", "reminder set อื่นๆ", "task list"],
      data: newReminder,
    };
  },
};

export const reminderListCommand: Command = {
  name: "reminder.list",
  description: "List all reminders",
  aliases: ["reminders", "r.list"],
  handler: async (context: AssistantContext): Promise<AssistantResponse> => {
    if (!context.userData || context.userData.reminders.length === 0) {
      return {
        message:
          "คุณยังไม่มีการเตือนใดๆ ใช้ `reminder set [หัวข้อ] at [เวลา]` เพื่อเพิ่ม",
        suggestions: [
          "reminder set ประชุม at 2pm",
          "remind me อาหารเที่ยง in 30 minutes",
        ],
      };
    }

    const reminders = context.userData.reminders
      .filter((r) => r.enabled)
      .sort((a, b) => a.time.getTime() - b.time.getTime());

    const reminderList = ["**⏰ การเตือนของคุณ:**"];

    reminders.forEach((reminder) => {
      const timeStr = reminder.time.toLocaleString("th-TH", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      const status = reminder.time < new Date() ? "(หมดเวลาแล้ว)" : "";
      reminderList.push(`• ${reminder.title} - ${timeStr} ${status}`);
    });

    return {
      message: reminderList.join("\n"),
      suggestions: [
        "reminder set เตือนใหม่",
        "reminder delete [id]",
        "task list",
      ],
      data: { reminders },
    };
  },
};

export const reminderDeleteCommand: Command = {
  name: "reminder.delete",
  description: "Delete a reminder",
  aliases: ["r.delete", "r.remove"],
  parameters: [
    {
      name: "identifier",
      type: "string",
      required: true,
      description: "Reminder ID or title",
    },
  ],
  handler: async (
    context: AssistantContext,
    args: Record<string, any>,
  ): Promise<AssistantResponse> => {
    const { identifier } = args;

    if (!identifier) {
      return {
        message: "กรุณาระบุ ID หรือหัวข้อของการเตือนที่ต้องการลบ",
        suggestions: ["reminder list", "reminder delete reminder-123"],
      };
    }

    if (!context.userData) {
      return {
        message: "ไม่สามารถเข้าถึงข้อมูลผู้ใช้ได้",
        suggestions: ["help", "reminder list"],
      };
    }

    const reminderIndex = context.userData.reminders.findIndex(
      (r) =>
        r.id === identifier ||
        r.title.toLowerCase().includes(identifier.toLowerCase()),
    );

    if (reminderIndex === -1) {
      return {
        message: `ไม่พบการเตือน "${identifier}" ใช้ \`reminder list\` เพื่อดูรายการ`,
        suggestions: ["reminder list", "reminder set เตือนใหม่"],
      };
    }

    const deletedReminder = context.userData.reminders.splice(
      reminderIndex,
      1,
    )[0];

    return {
      message: `🗑️ ลบการเตือน: "${deletedReminder.title}" เรียบร้อย`,
      suggestions: ["reminder list", "reminder set เตือนใหม่"],
      data: deletedReminder,
    };
  },
};
