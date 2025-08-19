#!/usr/bin/env node

/**
 * SOP Compliance Validator
 * Detects hardcoded values and SOP violations
 * Zero Hardcoding Policy Enforcement
 */

const fs = require("fs");
const path = require("path");

// Simple color functions for terminal output
const colors = {
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

// Patterns to detect hardcoded values
const VIOLATIONS = {
  PORTS: {
    pattern: /(?<![\w.])(400[0-9]|300[0-9]|808[0-9]|8080|3000)(?![\w])/g,
    message: "Hardcoded port number",
    severity: "CRITICAL",
    fix: "Use process.env.PORT or config",
  },
  LOCALHOST: {
    pattern: /localhost|127\.0\.0\.1/gi,
    message: "Hardcoded localhost/IP",
    severity: "CRITICAL",
    fix: "Use process.env.HOST or config",
  },
  WEBSOCKET_URL: {
    pattern: /wss?:\/\/[^'"}\s]+/g,
    message: "Hardcoded WebSocket URL",
    severity: "CRITICAL",
    fix: "Use getWebSocketUrl() helper",
  },
  HTTP_URL: {
    pattern: /https?:\/\/(?!github|npm|unpkg|cdn)[^'"}\s]+/g,
    message: "Hardcoded HTTP URL",
    severity: "HIGH",
    fix: "Use environment variables",
  },
  TIMEOUTS: {
    pattern: /setTimeout\([^,]+,\s*(\d{4,})\)/g,
    message: "Hardcoded timeout value",
    severity: "MEDIUM",
    fix: "Use config.timeouts.*",
  },
  MEMORY_LIMITS: {
    pattern: /(?<![\w])(1024|2048|4096|8192)(?![\w])/g,
    message: "Hardcoded memory limit",
    severity: "HIGH",
    fix: "Use config.memory.*",
  },
  MAX_LIMITS: {
    pattern: /MAX_[A-Z_]+\s*=\s*\d+/g,
    message: "Hardcoded max limit",
    severity: "MEDIUM",
    fix: "Use configuration module",
  },
  MAGIC_NUMBERS: {
    pattern: /(?<![.\w])(10|20|30|50|100|500|1000)(?![.\w])/g,
    message: "Magic number",
    severity: "LOW",
    fix: "Define as named constant",
  },
};

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "*.min.js",
  "*.map",
  "package-lock.json",
  "yarn.lock",
  "*.md",
  "*.json",
  "*.css",
  "*.scss",
  "scripts/sop-compliance-validator.js",
  "scripts/fix-hardcoded-values.js",
];

class SOPValidator {
  constructor() {
    this.violations = [];
    this.fileCount = 0;
    this.totalScore = 100;
  }

  shouldScan(filePath) {
    return !EXCLUDE_PATTERNS.some((pattern) => {
      if (pattern.includes("*")) {
        const regex = new RegExp(pattern.replace("*", ".*"));
        return regex.test(filePath);
      }
      return filePath.includes(pattern);
    });
  }

  scanFile(filePath) {
    if (!this.shouldScan(filePath)) return;

    const ext = path.extname(filePath);
    if (![".js", ".ts", ".jsx", ".tsx"].includes(ext)) return;

    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      Object.entries(VIOLATIONS).forEach(([type, rule]) => {
        let match;
        while ((match = rule.pattern.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split("\n").length;
          const line = lines[lineNum - 1];

          // Skip if it's in a comment
          if (
            line &&
            (line.trim().startsWith("//") || line.trim().startsWith("*"))
          ) {
            continue;
          }

          this.violations.push({
            file: filePath,
            line: lineNum,
            type,
            value: match[0],
            severity: rule.severity,
            message: rule.message,
            fix: rule.fix,
            context: line ? line.trim() : "",
          });
        }
        rule.pattern.lastIndex = 0; // Reset regex
      });

      this.fileCount++;
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error.message);
    }
  }

  scanDirectory(dir) {
    if (!this.shouldScan(dir)) return;

    try {
      const items = fs.readdirSync(dir);

      items.forEach((item) => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          this.scanDirectory(fullPath);
        } else if (stat.isFile()) {
          this.scanFile(fullPath);
        }
      });
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  }

  calculateScore() {
    const severityPenalty = {
      CRITICAL: 10,
      HIGH: 5,
      MEDIUM: 2,
      LOW: 0.5,
    };

    let penalty = 0;
    this.violations.forEach((v) => {
      penalty += severityPenalty[v.severity] || 0;
    });

    this.totalScore = Math.max(0, 100 - penalty);
    return this.totalScore;
  }

  generateReport() {
    console.log(
      colors.bold(colors.cyan("\n═══════════════════════════════════════════")),
    );
    console.log(
      colors.bold(colors.cyan("     SOP Compliance Validation Report      ")),
    );
    console.log(
      colors.bold(colors.cyan("═══════════════════════════════════════════\n")),
    );

    console.log(colors.gray(`Scanned ${this.fileCount} files`));
    console.log(colors.gray(`Found ${this.violations.length} violations\n`));

    // Group by severity
    const bySeverity = {};
    this.violations.forEach((v) => {
      if (!bySeverity[v.severity]) bySeverity[v.severity] = [];
      bySeverity[v.severity].push(v);
    });

    // Display by severity
    ["CRITICAL", "HIGH", "MEDIUM", "LOW"].forEach((severity) => {
      const items = bySeverity[severity] || [];
      if (items.length === 0) return;

      const color = {
        CRITICAL: colors.red,
        HIGH: colors.yellow,
        MEDIUM: colors.blue,
        LOW: colors.gray,
      }[severity];

      console.log(
        colors.bold(color(`\n${severity} VIOLATIONS (${items.length}):`)),
      );
      console.log(color("─".repeat(40)));

      // Show first 5 of each type
      const shown = items.slice(0, 5);
      shown.forEach((v) => {
        console.log(color(`• ${v.file}:${v.line}`));
        console.log(colors.gray(`  ${v.type}: "${v.value}"`));
        console.log(colors.gray(`  Fix: ${v.fix}`));
        if (v.context) {
          console.log(
            colors.gray(`  Context: ${v.context.substring(0, 60)}...`),
          );
        }
      });

      if (items.length > 5) {
        console.log(color(`  ... and ${items.length - 5} more`));
      }
    });

    // Calculate and display score
    const score = this.calculateScore();
    console.log("\n" + colors.bold("─".repeat(40)));

    const scoreColor =
      score >= 85 ? colors.green : score >= 60 ? colors.yellow : colors.red;

    console.log(
      colors.bold("Compliance Score: ") +
        colors.bold(scoreColor(`${score}/100`)),
    );

    if (score < 85) {
      console.log(
        colors.bold(colors.red("\n❌ FAILED: Score must be ≥ 85/100")),
      );
      console.log(colors.yellow("Run: npm run sop:fix to auto-fix violations"));
    } else {
      console.log(
        colors.bold(colors.green("\n✅ PASSED: SOPs compliance check")),
      );
    }

    // Save detailed report
    const reportPath = path.join(process.cwd(), "sop-violations.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          score: this.totalScore,
          filesScanned: this.fileCount,
          totalViolations: this.violations.length,
          violations: this.violations,
        },
        null,
        2,
      ),
    );

    console.log(colors.gray(`\nDetailed report saved to: ${reportPath}`));

    return score >= 85 ? 0 : 1; // Exit code
  }

  run() {
    const targetDir = process.argv[2] || process.cwd();

    console.log(colors.cyan("Starting SOP compliance check..."));
    console.log(colors.gray(`Scanning: ${targetDir}\n`));

    this.scanDirectory(path.join(targetDir, "src"));
    this.scanDirectory(path.join(targetDir, "docs"));

    const exitCode = this.generateReport();
    process.exit(exitCode);
  }
}

// Run validator
const validator = new SOPValidator();
validator.run();
