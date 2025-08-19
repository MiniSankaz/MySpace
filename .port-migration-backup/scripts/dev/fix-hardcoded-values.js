#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Files to check and fix
const filesToFix = [
  "src/app/api/health/route.ts",
  "src/hooks/useProjectSidebar.ts",
  "src/services/git.service.ts",
  "src/utils/websocket.ts",
  "src/utils/api-client.ts",
  "src/components/dashboard/RealTimeActivityFeed.tsx",
  "src/modules/workspace/components/Terminal/ClaudeXTermView.tsx",
  "src/modules/workspace/components/Terminal/XTermViewV2.tsx",
  "src/modules/workspace/hooks/useTerminalWebSocket.ts",
  "src/modules/workspace/services/terminal-websocket-multiplexer.ts",
  "src/modules/workspace/services/terminal-integration.service.ts",
];

const fixes = 0;

console.log("🔧 Starting to fix hardcoded values...\n");

filesToFix.forEach((file) => {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let originalContent = content;

  // Fix hardcoded ports
  content = content.replace(
    /process\.env\.PORT \|\| 3000/g,
    "process.env.PORT || 4000",
  );
  content = content.replace(/:3000(?![0-9])/g, ":${process.env.PORT || 4000}");
  content = content.replace(/:4000(?![0-9])/g, ":${process.env.PORT || 4000}");
  content = content.replace(
    /:4001(?![0-9])/g,
    ":${process.env.TERMINAL_WS_PORT || 4001}",
  );
  content = content.replace(
    /:4002(?![0-9])/g,
    ":${process.env.CLAUDE_WS_PORT || 4002}",
  );

  // Fix hardcoded URLs
  content = content.replace(
    /ws:\/\/localhost:4001/g,
    'getWebSocketUrl("legacy")',
  );
  content = content.replace(
    /ws:\/\/localhost:4002/g,
    'getWebSocketUrl("claude")',
  );
  content = content.replace(
    /ws:\/\/localhost:4000/g,
    'getWebSocketUrl("system")',
  );
  content = content.replace(/http:\/\/localhost:4000/g, "getApiUrl()");
  content = content.replace(/http:\/\/127\.0\.0\.1:4000/g, "getApiUrl()");

  // Add import if needed
  if (content.includes("getWebSocketUrl") || content.includes("getApiUrl")) {
    if (!content.includes("from '@/config/terminal.config'")) {
      const importStatement =
        "import { getWebSocketUrl, getApiUrl } from '@/config/terminal.config';\n";

      // Find the last import statement
      const importMatches = content.match(/^import .* from .*;$/gm);
      if (importMatches && importMatches.length > 0) {
        const lastImport = importMatches[importMatches.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        content =
          content.slice(0, lastImportIndex + lastImport.length) +
          "\n" +
          importStatement +
          content.slice(lastImportIndex + lastImport.length);
      } else {
        content = importStatement + "\n" + content;
      }
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Fixed: ${file}`);
  }
});

console.log("\n✨ Hardcoded values fix complete!");
console.log('Run "npm run type-check" to verify the changes.');
