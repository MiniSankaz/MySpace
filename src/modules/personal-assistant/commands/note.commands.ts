import { Command, AssistantContext, AssistantResponse, Note } from "../types";

export const noteCreateCommand: Command = {
  name: "note.create",
  description: "Create a new note",
  aliases: ["note", "n.create", "memo"],
  parameters: [
    {
      name: "content",
      type: "string",
      required: true,
      description: "Note content",
    },
  ],
  handler: async (
    context: AssistantContext,
    args: Record<string, any>,
  ): Promise<AssistantResponse> => {
    const { content } = args;

    if (!content) {
      return {
        message:
          "กรุณาระบุเนื้อหาโน้ต ตัวอย่าง: `note create ไอเดียสำหรับโปรเจคใหม่`",
        suggestions: [
          "note create รายการซื้อของ",
          "note create ไอเดียการประชุม",
        ],
      };
    }

    // Extract title from first line or first 50 chars
    const lines = content.split("\n");
    const title =
      lines[0].substring(0, 50) + (lines[0].length > 50 ? "..." : "");

    const newNote: Note = {
      id: `note-${Date.now()}`,
      title,
      content,
      tags: extractTags(content),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!context.userData) {
      return {
        message: "ไม่สามารถเข้าถึงข้อมูลผู้ใช้ได้",
        suggestions: ["help", "note list"],
      };
    }

    context.userData.notes.push(newNote);

    return {
      message: `📝 สร้างโน้ต: "${title}"\n${newNote.tags?.length > 0 ? `Tags: ${newNote.tags.join(", ")}` : ""}`,
      suggestions: [
        "note list",
        "note search [keyword]",
        "note create โน้ตอื่น",
      ],
      data: newNote,
    };
  },
};

export const noteListCommand: Command = {
  name: "note.list",
  description: "List all notes",
  aliases: ["notes", "n.list"],
  handler: async (context: AssistantContext): Promise<AssistantResponse> => {
    if (!context.userData || context.userData.notes.length === 0) {
      return {
        message: "คุณยังไม่มีโน้ตใดๆ ใช้ `note create [เนื้อหา]` เพื่อเพิ่ม",
        suggestions: ["note create รายการซื้อของ", "note create ไอเดียโปรเจค"],
      };
    }

    const notes = context.userData.notes
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10); // Show last 10 notes

    const noteList = ["**📝 โน้ตของคุณ (10 รายการล่าสุด):**"];

    notes.forEach((note) => {
      const dateStr = note.createdAt.toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
      });
      const tags = note.tags?.length > 0 ? ` [${note.tags.join(", ")}]` : "";
      noteList.push(`• ${note.title} - ${dateStr}${tags}`);
    });

    if (context.userData.notes.length > 10) {
      noteList.push(`\n_แสดง 10 จาก ${context.userData.notes.length} โน้ต_`);
    }

    return {
      message: noteList.join("\n"),
      suggestions: [
        "note create โน้ตใหม่",
        "note search [keyword]",
        "note view [id]",
      ],
      data: { notes },
    };
  },
};

export const noteSearchCommand: Command = {
  name: "note.search",
  description: "Search notes",
  aliases: ["n.search", "n.find"],
  parameters: [
    {
      name: "keyword",
      type: "string",
      required: true,
      description: "Search keyword",
    },
  ],
  handler: async (
    context: AssistantContext,
    args: Record<string, any>,
  ): Promise<AssistantResponse> => {
    const { keyword } = args;

    if (!keyword) {
      return {
        message: "กรุณาระบุคำค้นหา ตัวอย่าง: `note search ประชุม`",
        suggestions: ["note search ไอเดีย", "note list"],
      };
    }

    if (!context.userData || context.userData.notes.length === 0) {
      return {
        message: "คุณยังไม่มีโน้ตใดๆ",
        suggestions: ["note create โน้ตแรก"],
      };
    }

    const searchTerm = keyword.toLowerCase();
    const foundNotes = context.userData.notes.filter(
      (note) =>
        note.title.toLowerCase().includes(searchTerm) ||
        note.content.toLowerCase().includes(searchTerm) ||
        note.tags?.some((tag) => tag.toLowerCase().includes(searchTerm)),
    );

    if (foundNotes.length === 0) {
      return {
        message: `ไม่พบโน้ตที่ตรงกับ "${keyword}"`,
        suggestions: ["note list", "note create โน้ตใหม่"],
      };
    }

    const resultList = [`**🔍 พบ ${foundNotes.length} โน้ต:**`];

    foundNotes.slice(0, 5).forEach((note) => {
      const preview =
        note.content.substring(0, 100) +
        (note.content.length > 100 ? "..." : "");
      resultList.push(`\n**${note.title}**\n${preview}`);
    });

    if (foundNotes.length > 5) {
      resultList.push(`\n_แสดง 5 จาก ${foundNotes.length} ผลลัพธ์_`);
    }

    return {
      message: resultList.join("\n"),
      suggestions: ["note view [id]", "note edit [id]", "note list"],
      data: { notes: foundNotes },
    };
  },
};

export const noteDeleteCommand: Command = {
  name: "note.delete",
  description: "Delete a note",
  aliases: ["n.delete", "n.remove"],
  parameters: [
    {
      name: "identifier",
      type: "string",
      required: true,
      description: "Note ID or title",
    },
  ],
  handler: async (
    context: AssistantContext,
    args: Record<string, any>,
  ): Promise<AssistantResponse> => {
    const { identifier } = args;

    if (!identifier) {
      return {
        message: "กรุณาระบุ ID หรือหัวข้อของโน้ตที่ต้องการลบ",
        suggestions: ["note list", "note delete note-123"],
      };
    }

    if (!context.userData) {
      return {
        message: "ไม่สามารถเข้าถึงข้อมูลผู้ใช้ได้",
        suggestions: ["help", "note list"],
      };
    }

    const noteIndex = context.userData.notes.findIndex(
      (n) =>
        n.id === identifier ||
        n.title.toLowerCase().includes(identifier.toLowerCase()),
    );

    if (noteIndex === -1) {
      return {
        message: `ไม่พบโน้ต "${identifier}" ใช้ \`note list\` เพื่อดูรายการ`,
        suggestions: ["note list", "note search"],
      };
    }

    const deletedNote = context.userData.notes.splice(noteIndex, 1)[0];

    return {
      message: `🗑️ ลบโน้ต: "${deletedNote.title}" เรียบร้อย`,
      suggestions: ["note list", "note create โน้ตใหม่"],
      data: deletedNote,
    };
  },
};

// Helper function to extract hashtags from content
function extractTags(content: string): string[] {
  const tagRegex = /#(\w+)/g;
  const tags: string[] = [];
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1]);
  }

  return [...new Set(tags)]; // Remove duplicates
}
