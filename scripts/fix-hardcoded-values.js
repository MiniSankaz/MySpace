#!/usr/bin/env node

/**
 * Auto-fix Hardcoded Values
 * Automatically replaces hardcoded values with configuration
 */

const fs = require('fs');
const path = require('path');

// Simple color functions for terminal output
const colors = {
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

class HardcodedFixer {
  constructor() {
    this.fixes = 0;
    this.files = new Set();
    this.dryRun = process.argv.includes('--dry-run');
  }

  // Replacement rules
  getReplacements() {
    return [
      // Ports
      { 
        pattern: /(?<![\w.])4001(?![\w])/g,
        replacement: 'terminalConfig.websocket.port',
        needsImport: true
      },
      {
        pattern: /(?<![\w.])4002(?![\w])/g,
        replacement: 'terminalConfig.websocket.claudePort',
        needsImport: true
      },
      {
        pattern: /(?<![\w.])4000(?![\w])/g,
        replacement: 'process.env.PORT || 4000',
        needsImport: false
      },
      {
        pattern: /(?<![\w.])3000(?![\w])/g,
        replacement: 'process.env.PORT || 3000',
        needsImport: false
      },
      
      // Localhost
      {
        pattern: /['"]localhost['"]/g,
        replacement: 'process.env.HOST || "localhost"',
        needsImport: false
      },
      {
        pattern: /['"]127\.0\.0\.1['"]/g,
        replacement: 'process.env.HOST || "127.0.0.1"',
        needsImport: false
      },
      
      // WebSocket URLs
      {
        pattern: /['"]ws:\/\/localhost:4001['"]/g,
        replacement: 'getWebSocketUrl("system")',
        needsImport: true,
        importFrom: '@/config/terminal.config'
      },
      {
        pattern: /['"]ws:\/\/localhost:4002['"]/g,
        replacement: 'getWebSocketUrl("claude")',
        needsImport: true,
        importFrom: '@/config/terminal.config'
      },
      
      // Memory limits
      {
        pattern: /(?<![\w])2048(?![\w])/g,
        replacement: 'terminalConfig.memory.rssWarningThreshold',
        needsImport: true,
        context: /memory|rss|heap/i
      },
      {
        pattern: /(?<![\w])6144(?![\w])/g,
        replacement: 'terminalConfig.memory.rssEmergencyThreshold',
        needsImport: true,
        context: /memory|rss|emergency/i
      },
      
      // Timeouts
      {
        pattern: /setTimeout\(([^,]+),\s*5000\)/g,
        replacement: 'setTimeout($1, terminalConfig.websocket.timeout)',
        needsImport: true
      },
      {
        pattern: /setTimeout\(([^,]+),\s*30000\)/g,
        replacement: 'setTimeout($1, terminalConfig.suspension.cleanupInterval)',
        needsImport: true
      },
      
      // Max limits
      {
        pattern: /MAX_TOTAL_SESSIONS\s*=\s*50/g,
        replacement: 'MAX_TOTAL_SESSIONS = terminalConfig.memory.maxTotalSessions',
        needsImport: true
      },
      {
        pattern: /MAX_SESSIONS_PER_PROJECT\s*=\s*20/g,
        replacement: 'MAX_SESSIONS_PER_PROJECT = terminalConfig.memory.maxSessionsPerProject',
        needsImport: true
      },
      {
        pattern: /MAX_FOCUSED_PER_PROJECT\s*=\s*10/g,
        replacement: 'MAX_FOCUSED_PER_PROJECT = terminalConfig.memory.maxFocusedPerProject',
        needsImport: true
      }
    ];
  }

  fixFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    
    const ext = path.extname(filePath);
    if (!['.js', '.ts', '.jsx', '.tsx'].includes(ext)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let needsImport = false;
    
    const replacements = this.getReplacements();
    
    replacements.forEach(rule => {
      // Check context if specified
      if (rule.context && !rule.context.test(content)) {
        return;
      }
      
      const originalContent = content;
      content = content.replace(rule.pattern, rule.replacement);
      
      if (content !== originalContent) {
        modified = true;
        if (rule.needsImport) {
          needsImport = true;
        }
        this.fixes++;
      }
    });
    
    // Add import if needed
    if (needsImport && modified) {
      const importStatement = `import { terminalConfig, getWebSocketUrl } from '@/config/terminal.config';`;
      
      // Check if import already exists
      if (!content.includes(importStatement)) {
        // Add after first import or at top
        const importMatch = content.match(/^import .* from .*;/m);
        if (importMatch) {
          const position = importMatch.index + importMatch[0].length;
          content = content.slice(0, position) + '\n' + importStatement + content.slice(position);
        } else {
          content = importStatement + '\n\n' + content;
        }
      }
    }
    
    if (modified) {
      if (this.dryRun) {
        console.log(colors.yellow(`Would fix: ${filePath}`));
      } else {
        fs.writeFileSync(filePath, content);
        console.log(colors.green(`Fixed: ${filePath}`));
      }
      this.files.add(filePath);
    }
  }

  fixDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      // Skip certain directories
      if (['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
        return;
      }
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.fixDirectory(fullPath);
      } else if (stat.isFile()) {
        this.fixFile(fullPath);
      }
    });
  }

  run() {
    console.log(colors.bold(colors.cyan('\n🔧 Auto-fixing Hardcoded Values\n')));
    
    if (this.dryRun) {
      console.log(colors.yellow('DRY RUN MODE - No files will be modified\n'));
    }
    
    // Fix source files
    this.fixDirectory(path.join(process.cwd(), 'src'));
    
    console.log(colors.bold('\n─'.repeat(40)));
    console.log(colors.green(`\n✅ Fixed ${this.fixes} violations in ${this.files.size} files`));
    
    if (this.dryRun) {
      console.log(colors.yellow('\nRun without --dry-run to apply fixes'));
    } else {
      console.log(colors.cyan('\nRun npm run sop:check to verify compliance'));
    }
  }
}

// Run fixer
const fixer = new HardcodedFixer();
fixer.run();