export interface Intent {
  command?: string;
  parameters: Record<string, any>;
  confidence: number;
}

export class NLPProcessor {
  private patterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    this.patterns.set("help", [
      /^help$/i,
      /^what can you do/i,
      /^show commands/i,
      /^how to use/i,
    ]);

    this.patterns.set("task.add", [
      /^(?:add|create|new)\s+task\s+(.+)$/i,
      /^task\s+(?:add|create)\s+(.+)$/i,
      /^todo\s+(.+)$/i,
    ]);

    this.patterns.set("task.list", [
      /^(?:list|show|display)\s+tasks?$/i,
      /^tasks?$/i,
      /^what are my tasks/i,
      /^todo list$/i,
    ]);

    this.patterns.set("task.complete", [
      /^(?:complete|finish|done)\s+task\s+(.+)$/i,
      /^task\s+(?:complete|done)\s+(.+)$/i,
      /^mark\s+(.+)\s+(?:as\s+)?(?:complete|done)$/i,
    ]);

    this.patterns.set("reminder.set", [
      /^(?:set|create|add)\s+reminder\s+(.+)\s+(?:at|for)\s+(.+)$/i,
      /^remind\s+me\s+(?:to\s+)?(.+)\s+(?:at|in)\s+(.+)$/i,
      /^reminder\s+(.+)\s+(.+)$/i,
    ]);

    this.patterns.set("reminder.list", [
      /^(?:list|show)\s+reminders?$/i,
      /^reminders?$/i,
      /^what are my reminders/i,
    ]);

    this.patterns.set("note.create", [
      /^(?:create|add|new)\s+note\s+(.+)$/i,
      /^note\s+(.+)$/i,
      /^take\s+(?:a\s+)?note\s+(.+)$/i,
    ]);

    this.patterns.set("note.list", [
      /^(?:list|show)\s+notes?$/i,
      /^notes?$/i,
      /^what are my notes/i,
    ]);

    // AI commands patterns
    this.patterns.set("ai.chat", [
      /^ai\s+(.+)$/i,
      /^claude\s+(.+)$/i,
      /^ask\s+(.+)$/i,
      /^คุย(.+)$/i,
      /^ถาม(.+)$/i,
    ]);

    this.patterns.set("ai.code", [
      /^code\s+(.+)$/i,
      /^generate\s+code\s+(.+)$/i,
      /^สร้างโค้ด\s+(.+)$/i,
    ]);

    this.patterns.set("ai.explain", [
      /^explain\s+(.+)$/i,
      /^what\s+is\s+(.+)$/i,
      /^อธิบาย\s+(.+)$/i,
    ]);

    this.patterns.set("ai.debug", [
      /^debug\s+(.+)$/i,
      /^fix\s+(.+)$/i,
      /^แก้บัค\s+(.+)$/i,
    ]);

    this.patterns.set("ai.analyze", [
      /^analyze\s+(.+)$/i,
      /^review\s+(.+)$/i,
      /^วิเคราะห์\s+(.+)$/i,
    ]);
  }

  async extractIntent(message: string): Promise<Intent> {
    const normalizedMessage = message.trim();

    for (const [command, patterns] of this.patterns.entries()) {
      for (const pattern of patterns) {
        const match = normalizedMessage.match(pattern);
        if (match) {
          return {
            command,
            parameters: this.extractParameters(command, match),
            confidence: 0.9,
          };
        }
      }
    }

    return this.analyzeWithSimpleNLP(normalizedMessage);
  }

  private extractParameters(
    command: string,
    match: RegExpMatchArray,
  ): Record<string, any> {
    const params: Record<string, any> = {};

    switch (command) {
      case "task.add":
        if (match[1]) params.title = match[1].trim();
        break;
      case "task.complete":
        if (match[1]) params.identifier = match[1].trim();
        break;
      case "reminder.set":
        if (match[1]) params.title = match[1].trim();
        if (match[2]) params.time = this.parseTime(match[2].trim());
        break;
      case "note.create":
        if (match[1]) params.content = match[1].trim();
        break;
      // AI commands
      case "ai.chat":
        if (match[1]) params.message = match[1].trim();
        break;
      case "ai.code":
        if (match[1]) params.requirements = match[1].trim();
        break;
      case "ai.explain":
        if (match[1]) params.content = match[1].trim();
        break;
      case "ai.debug":
        if (match[1]) params.problem = match[1].trim();
        break;
      case "ai.analyze":
        if (match[1]) params.code = match[1].trim();
        break;
    }

    return params;
  }

  private parseTime(timeStr: string): Date {
    const now = new Date();

    const inMinutesMatch = timeStr.match(/^in\s+(\d+)\s+minutes?$/i);
    if (inMinutesMatch) {
      const minutes = parseInt(inMinutesMatch[1]);
      return new Date(now.getTime() + minutes * 60000);
    }

    const inHoursMatch = timeStr.match(/^in\s+(\d+)\s+hours?$/i);
    if (inHoursMatch) {
      const hours = parseInt(inHoursMatch[1]);
      return new Date(now.getTime() + hours * 3600000);
    }

    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3]?.toLowerCase();

      if (period === "pm" && hours < 12) hours += 12;
      if (period === "am" && hours === 12) hours = 0;

      const result = new Date(now);
      result.setHours(hours, minutes, 0, 0);

      if (result < now) {
        result.setDate(result.getDate() + 1);
      }

      return result;
    }

    return new Date(now.getTime() + 3600000);
  }

  private analyzeWithSimpleNLP(message: string): Intent {
    const words = message.toLowerCase().split(/\s+/);
    const intent: Intent = {
      parameters: {},
      confidence: 0.5,
    };

    const commandKeywords = {
      help: ["help", "assist", "support", "ช่วย", "คำสั่ง"],
      "task.add": ["task", "todo", "add", "งาน"],
      "task.list": ["tasks", "todos", "list"],
      "reminder.set": ["remind", "reminder", "alert", "เตือน"],
      "note.create": ["note", "memo", "write", "บันทึก"],
      "ai.chat": ["ai", "claude", "ask", "chat", "คุย", "ถาม", "พูด"],
    };

    for (const [command, keywords] of Object.entries(commandKeywords)) {
      const matchCount = keywords.filter((keyword) =>
        words.includes(keyword),
      ).length;

      if (matchCount > 0) {
        intent.command = command;
        intent.confidence = Math.min(0.7, 0.3 * matchCount);
        break;
      }
    }

    return intent;
  }
}
