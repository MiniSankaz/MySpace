/**
 * Central export file for all modules
 * This helps Claude Code understand the module structure quickly
 */

// I18n Module
export * from "./i18n/hooks/useTranslation";
export * from "./i18n/services/translation.service";
export * from "./i18n/types";

// Page Builder Module
export { default as PageBuilder } from "./page-builder/components/PageBuilder";
export * from "./page-builder/types";
export * from "./page-builder/services/pageService";

// Personal Assistant Module
export { default as ChatInterface } from "./personal-assistant/components/ChatInterfaceWithFolders";
export * from "./personal-assistant/types";
export * from "./personal-assistant/services/assistant.service";
// Note: claude-ai.service is replaced with claude-direct.service in @/services

// Terminal Module
export { default as WebTerminal } from "./terminal/components/WebTerminal";
export * from "./terminal/services/terminal.service";

// User Management System (UMS) Module
export { default as LoginForm } from "./ums/components/LoginForm";
export { default as RegisterForm } from "./ums/components/RegisterForm";
export * from "./ums/services/auth.service";
export * from "./ums/services/user.service";
export * from "./ums/services/role.service";

// User Module
export * from "./user/types";
export * from "./user/services/rbac.service";
