import crypto from "crypto";
import { z } from "zod";
import { FILE_UPLOAD_CONFIG } from "@core/utils/file-upload";

// Security configuration
export const SECURITY_CONFIG = {
  // Virus scanning
  SCAN_TIMEOUT: 30000, // 30 seconds
  QUARANTINE_DIR: "./quarantine",
  SCAN_ON_UPLOAD: true,
  SCAN_PERIODICALLY: true,
  SCAN_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours

  // Rate limiting
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 10,
  RATE_LIMIT_MAX_UPLOADS: 5,
  RATE_LIMIT_MAX_SIZE: 100 * 1024 * 1024, // 100MB per minute

  // Content filtering
  SCAN_CONTENT: true,
  BLOCK_SUSPICIOUS_PATTERNS: true,

  // Access control
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_CONCURRENT_UPLOADS: 3,

  // Monitoring
  LOG_SECURITY_EVENTS: true,
  ALERT_ON_THREATS: true,
  ALERT_WEBHOOK_URL: process.env.SECURITY_WEBHOOK_URL,
};

// Virus scanning interfaces
export interface VirusScanRequest {
  filePath: string;
  buffer?: Buffer;
  metadata?: Record<string, any>;
  scanEngine?: "clamav" | "windows-defender" | "custom";
}

export interface VirusScanResult {
  clean: boolean;
  infected: boolean;
  threats: string[];
  scanEngine: string;
  scanTime: number;
  quarantined: boolean;
  scanDate: string;
  signature?: string;
  riskLevel: "low" | "medium" | "high";
}

// Enhanced rate limiting with multiple strategies
export class AdvancedRateLimiter {
  private requestCounts: Map<string, { count: number; resetTime: number }> =
    new Map();
  private uploadCounts: Map<
    string,
    { count: number; size: number; resetTime: number }
  > = new Map();
  private suspiciousIPs: Set<string> = new Set();
  private blockedIPs: Map<string, number> = new Map(); // IP -> unblock timestamp

  constructor(
    private maxRequests = SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS,
    private maxUploads = SECURITY_CONFIG.RATE_LIMIT_MAX_UPLOADS,
    private maxSize = SECURITY_CONFIG.RATE_LIMIT_MAX_SIZE,
    private windowMs = SECURITY_CONFIG.RATE_LIMIT_WINDOW,
  ) {}

  // Check rate limits for requests
  checkRequestLimit(
    identifier: string,
    ip?: string,
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    blocked: boolean;
  } {
    const now = Date.now();

    // Check if IP is blocked
    if (ip && this.blockedIPs.has(ip)) {
      const unblockTime = this.blockedIPs.get(ip)!;
      if (now < unblockTime) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: unblockTime,
          blocked: true,
        };
      } else {
        this.blockedIPs.delete(ip);
      }
    }

    const current = this.requestCounts.get(identifier);

    if (!current || now > current.resetTime) {
      const resetTime = now + this.windowMs;
      this.requestCounts.set(identifier, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime,
        blocked: false,
      };
    }

    if (current.count >= this.maxRequests) {
      // Mark as suspicious if exceeding limits repeatedly
      if (ip && current.count > this.maxRequests * 2) {
        this.suspiciousIPs.add(ip);
      }
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
        blocked: false,
      };
    }

    current.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - current.count,
      resetTime: current.resetTime,
      blocked: false,
    };
  }

  // Check rate limits for uploads (includes size limits)
  checkUploadLimit(
    identifier: string,
    fileSize: number,
    ip?: string,
  ): {
    allowed: boolean;
    remainingUploads: number;
    remainingSize: number;
    resetTime: number;
    blocked: boolean;
  } {
    const now = Date.now();

    // Check if IP is blocked
    if (ip && this.blockedIPs.has(ip)) {
      const unblockTime = this.blockedIPs.get(ip)!;
      if (now < unblockTime) {
        return {
          allowed: false,
          remainingUploads: 0,
          remainingSize: 0,
          resetTime: unblockTime,
          blocked: true,
        };
      } else {
        this.blockedIPs.delete(ip);
      }
    }

    const current = this.uploadCounts.get(identifier);

    if (!current || now > current.resetTime) {
      const resetTime = now + this.windowMs;
      this.uploadCounts.set(identifier, {
        count: 1,
        size: fileSize,
        resetTime,
      });
      return {
        allowed: true,
        remainingUploads: this.maxUploads - 1,
        remainingSize: this.maxSize - fileSize,
        resetTime,
        blocked: false,
      };
    }

    // Check upload count limit
    if (current.count >= this.maxUploads) {
      return {
        allowed: false,
        remainingUploads: 0,
        remainingSize: Math.max(0, this.maxSize - current.size),
        resetTime: current.resetTime,
        blocked: false,
      };
    }

    // Check size limit
    if (current.size + fileSize > this.maxSize) {
      return {
        allowed: false,
        remainingUploads: Math.max(0, this.maxUploads - current.count),
        remainingSize: Math.max(0, this.maxSize - current.size),
        resetTime: current.resetTime,
        blocked: false,
      };
    }

    current.count++;
    current.size += fileSize;

    return {
      allowed: true,
      remainingUploads: this.maxUploads - current.count,
      remainingSize: this.maxSize - current.size,
      resetTime: current.resetTime,
      blocked: false,
    };
  }

  // Block IP temporarily
  blockIP(ip: string, durationMs: number = 60 * 60 * 1000): void {
    const unblockTime = Date.now() + durationMs;
    this.blockedIPs.set(ip, unblockTime);
    this.logSecurityEvent("IP_BLOCKED", { ip, durationMs, unblockTime });
  }

  // Check if IP is suspicious
  isSuspicious(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();

    for (const [key, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(key);
      }
    }

    for (const [key, data] of this.uploadCounts.entries()) {
      if (now > data.resetTime) {
        this.uploadCounts.delete(key);
      }
    }

    for (const [ip, unblockTime] of this.blockedIPs.entries()) {
      if (now > unblockTime) {
        this.blockedIPs.delete(ip);
      }
    }
  }

  private logSecurityEvent(event: string, data: any): void {
    if (SECURITY_CONFIG.LOG_SECURITY_EVENTS) {
      console.log(`[SECURITY] ${event}:`, data);
    }
  }
}

// Content security scanner
export class ContentSecurityScanner {
  private suspiciousPatterns: RegExp[] = [
    // Script injection patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,

    // SQL injection patterns
    /(\bunion\b|\bselect\b|\bfrom\b|\bwhere\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b).*?(\b(or|and)\b.*?){2,}/gi,

    // Path traversal patterns
    /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/gi,

    // Suspicious file patterns
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|app|dmg)$/gi,
  ];

  private dangerousFileSignatures: Map<string, string[]> = new Map([
    // PE executable
    ["MZ", ["4d5a"]],
    // ELF executable
    ["\x7fELF", ["7f454c46"]],
    // Java class file
    ["\xca\xfe\xba\xbe", ["cafebabe"]],
    // Mach-O executable (macOS)
    ["\xfe\xed\xfa\xce", ["feedface"]],
    ["\xfe\xed\xfa\xcf", ["feedfacf"]],
  ]);

  // Scan file buffer for suspicious content
  scanBuffer(
    buffer: Buffer,
    filename: string,
  ): {
    safe: boolean;
    threats: string[];
    riskLevel: "low" | "medium" | "high";
  } {
    const threats: string[] = [];
    let riskLevel: "low" | "medium" | "high" = "low";

    // Check file signature
    const signature = this.checkFileSignature(buffer);
    if (signature.suspicious) {
      threats.push(`Suspicious file signature: ${signature.type}`);
      riskLevel = "high";
    }

    // Check filename patterns
    const filenameCheck = this.checkFilename(filename);
    if (filenameCheck.suspicious) {
      threats.push(`Suspicious filename pattern: ${filename}`);
      riskLevel = riskLevel === "high" ? "high" : "medium";
    }

    // Check content patterns (first 1MB only for performance)
    const contentCheck = this.checkContent(buffer.slice(0, 1024 * 1024));
    if (contentCheck.suspicious) {
      threats.push(...contentCheck.threats);
      riskLevel = "high";
    }

    return {
      safe: threats.length === 0,
      threats,
      riskLevel,
    };
  }

  private checkFileSignature(buffer: Buffer): {
    suspicious: boolean;
    type?: string;
  } {
    const header = buffer.slice(0, 16).toString("hex");

    for (const [type, signatures] of this.dangerousFileSignatures.entries()) {
      for (const sig of signatures) {
        if (header.startsWith(sig)) {
          return { suspicious: true, type };
        }
      }
    }

    return { suspicious: false };
  }

  private checkFilename(filename: string): {
    suspicious: boolean;
    patterns: string[];
  } {
    const suspiciousPatterns: string[] = [];

    // Check for suspicious extensions
    if (/\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|app|dmg)$/i.test(filename)) {
      suspiciousPatterns.push("dangerous_extension");
    }

    // Check for double extensions
    if (/\.[a-z0-9]{1,4}\.[a-z0-9]{1,4}$/i.test(filename)) {
      suspiciousPatterns.push("double_extension");
    }

    // Check for long filenames (potential buffer overflow)
    if (filename.length > 255) {
      suspiciousPatterns.push("excessive_length");
    }

    // Check for suspicious characters
    if (/[<>:"|?*\x00-\x1f]/.test(filename)) {
      suspiciousPatterns.push("suspicious_characters");
    }

    return {
      suspicious: suspiciousPatterns.length > 0,
      patterns: suspiciousPatterns,
    };
  }

  private checkContent(buffer: Buffer): {
    suspicious: boolean;
    threats: string[];
  } {
    const threats: string[] = [];
    const content = buffer.toString("utf8", 0, Math.min(buffer.length, 10000));

    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(content)) {
        threats.push(`Suspicious content pattern: ${pattern.source}`);
      }
    }

    return {
      suspicious: threats.length > 0,
      threats,
    };
  }
}

// Mock virus scanner (replace with real implementation)
export class VirusScanner {
  private scanHistory: Map<string, VirusScanResult> = new Map();

  async scanFile(request: VirusScanRequest): Promise<VirusScanResult> {
    const startTime = Date.now();

    try {
      // Generate file hash for caching
      const buffer = request.buffer || (await this.readFile(request.filePath));
      const hash = crypto.createHash("sha256").update(buffer).digest("hex");

      // Check cache first
      const cached = this.scanHistory.get(hash);
      if (
        cached &&
        Date.now() - new Date(cached.scanDate).getTime() < 24 * 60 * 60 * 1000
      ) {
        return cached;
      }

      // Perform content security scan
      const contentScanner = new ContentSecurityScanner();
      const contentScan = contentScanner.scanBuffer(buffer, request.filePath);

      // Simulate virus scan delay
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 2000 + 500),
      );

      // Mock scan result (replace with real virus scanner integration)
      const result: VirusScanResult = {
        clean: contentScan.safe && Math.random() > 0.05, // 5% false positive rate for demo
        infected: !contentScan.safe || Math.random() < 0.05,
        threats: contentScan.threats,
        scanEngine: request.scanEngine || "MockScanner",
        scanTime: Date.now() - startTime,
        quarantined: false,
        scanDate: new Date().toISOString(),
        signature: hash,
        riskLevel: contentScan.riskLevel,
      };

      // If infected, quarantine the file
      if (result.infected) {
        result.quarantined = await this.quarantineFile(request.filePath, hash);
        await this.alertThreatDetected(result, request);
      }

      // Cache result
      this.scanHistory.set(hash, result);

      return result;
    } catch (error) {
      console.error("Virus scan failed:", error);

      // Return safe result on error to avoid blocking uploads
      return {
        clean: false,
        infected: false,
        threats: ["Scan failed - manual review required"],
        scanEngine: "error",
        scanTime: Date.now() - startTime,
        quarantined: false,
        scanDate: new Date().toISOString(),
        riskLevel: "medium",
      };
    }
  }

  private async readFile(filePath: string): Promise<Buffer> {
    const fs = await import("fs/promises");
    return fs.readFile(filePath);
  }

  private async quarantineFile(
    filePath: string,
    hash: string,
  ): Promise<boolean> {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");

      // Ensure quarantine directory exists
      await fs.mkdir(SECURITY_CONFIG.QUARANTINE_DIR, { recursive: true });

      // Move file to quarantine
      const quarantinePath = path.join(
        SECURITY_CONFIG.QUARANTINE_DIR,
        `${hash}_${Date.now()}`,
      );
      await fs.rename(filePath, quarantinePath);

      console.log(`File quarantined: ${filePath} -> ${quarantinePath}`);
      return true;
    } catch (error) {
      console.error("Failed to quarantine file:", error);
      return false;
    }
  }

  private async alertThreatDetected(
    result: VirusScanResult,
    request: VirusScanRequest,
  ): Promise<void> {
    if (!SECURITY_CONFIG.ALERT_ON_THREATS) return;

    const alert = {
      type: "VIRUS_DETECTED",
      timestamp: new Date().toISOString(),
      file: request.filePath,
      threats: result.threats,
      riskLevel: result.riskLevel,
      scanEngine: result.scanEngine,
      quarantined: result.quarantined,
    };

    console.error("[SECURITY ALERT] Virus detected:", alert);

    // Send webhook alert if configured
    if (SECURITY_CONFIG.ALERT_WEBHOOK_URL) {
      try {
        const response = await fetch(SECURITY_CONFIG.ALERT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alert),
        });

        if (!response.ok) {
          console.error("Failed to send security alert webhook");
        }
      } catch (error) {
        console.error("Error sending security alert:", error);
      }
    }
  }

  // Clean up old scan history
  cleanup(): void {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [hash, result] of this.scanHistory.entries()) {
      if (new Date(result.scanDate).getTime() < cutoff) {
        this.scanHistory.delete(hash);
      }
    }
  }
}

// Security monitoring and logging
export class SecurityMonitor {
  private events: Array<{
    timestamp: string;
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    source: string;
    data: any;
  }> = [];

  logEvent(
    type: string,
    severity: "low" | "medium" | "high" | "critical",
    source: string,
    data: any,
  ): void {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      severity,
      source,
      data,
    };

    this.events.push(event);

    if (SECURITY_CONFIG.LOG_SECURITY_EVENTS) {
      console.log(`[SECURITY] ${severity.toUpperCase()} - ${type}:`, data);
    }

    // Alert on critical events
    if (severity === "critical" && SECURITY_CONFIG.ALERT_ON_THREATS) {
      this.sendAlert(event);
    }

    // Keep only recent events (last 1000)
    if (this.events.length > 1000) {
      this.events.splice(0, this.events.length - 1000);
    }
  }

  private async sendAlert(event: any): Promise<void> {
    if (!SECURITY_CONFIG.ALERT_WEBHOOK_URL) return;

    try {
      await fetch(SECURITY_CONFIG.ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SECURITY_ALERT",
          event,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Failed to send security alert:", error);
    }
  }

  getRecentEvents(hours: number = 24): any[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.events.filter(
      (event) => new Date(event.timestamp).getTime() > cutoff,
    );
  }
}

// Global instances
export const advancedRateLimiter = new AdvancedRateLimiter();
export const virusScanner = new VirusScanner();
export const securityMonitor = new SecurityMonitor();

// Cleanup intervals
setInterval(
  () => {
    advancedRateLimiter.cleanup();
    virusScanner.cleanup();
  },
  5 * 60 * 1000,
); // Every 5 minutes

// Security utility functions
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

export function hashFile(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function validateFileIntegrity(
  buffer: Buffer,
  expectedHash: string,
): boolean {
  const actualHash = hashFile(buffer);
  return actualHash === expectedHash;
}

export function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const allowedHeaders = [
    "content-type",
    "content-length",
    "cache-control",
    "last-modified",
    "etag",
    "accept-ranges",
    "content-range",
    "content-disposition",
  ];

  for (const [key, value] of Object.entries(headers)) {
    if (allowedHeaders.includes(key.toLowerCase())) {
      // Remove any suspicious characters from header values
      sanitized[key] = value.replace(/[\r\n\x00-\x1f]/g, "");
    }
  }

  return sanitized;
}
