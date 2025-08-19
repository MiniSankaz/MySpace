export interface Message {
  id: string;
  userId: string;
  content: string;
  type: "user" | "assistant" | "system";
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  parameters?: CommandParameter[];
  handler: CommandHandler;
}

export interface CommandParameter {
  name: string;
  type: "string" | "number" | "boolean" | "date";
  required?: boolean;
  description?: string;
}

export type CommandHandler = (
  context: AssistantContext,
  args: Record<string, any>,
) => Promise<AssistantResponse>;

export interface AssistantContext {
  userId: string;
  sessionId: string;
  conversation: Message[];
  userData?: UserData;
  metadata?: Record<string, any>;
}

export interface AssistantResponse {
  message: string;
  suggestions?: string[];
  actions?: Action[];
  data?: any;
}

export interface Action {
  type: "navigate" | "execute" | "display";
  payload: any;
}

export interface UserData {
  preferences: UserPreferences;
  history: Message[];
  tasks: Task[];
  reminders: Reminder[];
  notes: Note[];
}

export interface UserPreferences {
  language: string;
  timezone: string;
  theme: "light" | "dark" | "auto";
  notifications: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  time: Date;
  recurring?: RecurrencePattern;
  enabled: boolean;
  createdAt: Date;
}

export interface RecurrencePattern {
  type: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  endDate?: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
