/**
 * Whitelist configuration for auto-approved commands
 * These commands can be executed without user permission
 */

export interface WhitelistPattern {
  pattern: RegExp;
  category: string;
  description: string;
}

export const SAFE_COMMANDS: Record<string, WhitelistPattern[]> = {
  health: [
    {
      pattern: /curl\s+-s\s+http:\/\/localhost:\d+\/health/,
      category: 'health_check',
      description: 'Health check for localhost services'
    },
    {
      pattern: /curl\s+-s\s+http:\/\/127\.0\.0\.1:\d+\/health/,
      category: 'health_check',
      description: 'Health check for 127.0.0.1 services'
    },
    {
      pattern: /curl\s+-s\s+http:\/\/localhost:\d+\/api\/health/,
      category: 'health_check',
      description: 'API health check'
    }
  ],
  api: [
    {
      pattern: /^curl -X GET http:\/\/localhost:\d+\/api\/v1\/.*$/,
      category: 'api_test',
      description: 'GET requests to API v1 endpoints'
    },
    {
      pattern: /^curl -X POST http:\/\/localhost:\d+\/api\/v1\/test\/.*$/,
      category: 'api_test',
      description: 'POST requests to test endpoints'
    },
    {
      pattern: /^curl -s http:\/\/localhost:4110\/services$/,
      category: 'service_discovery',
      description: 'Gateway service discovery'
    },
    {
      pattern: /^curl -s http:\/\/localhost:4110\/health\/all$/,
      category: 'health_check',
      description: 'Aggregate health check'
    }
  ],
  scripts: [
    {
      pattern: /^\.\/test-.*\.sh$/,
      category: 'test_script',
      description: 'Test shell scripts in root'
    },
    {
      pattern: /^\.\/scripts\/test-.*\.sh$/,
      category: 'test_script',
      description: 'Test shell scripts in scripts directory'
    },
    {
      pattern: /^npm test$/,
      category: 'npm_test',
      description: 'NPM test command'
    },
    {
      pattern: /^npm run test(:.*)?$/,
      category: 'npm_test',
      description: 'NPM test scripts'
    }
  ],
  testing: [
    {
      pattern: /^curl.*http:\/\/localhost:4180\/api\/v1\/test\/.*$/,
      category: 'testing_service',
      description: 'Testing Service API calls'
    }
  ]
};

/**
 * Commands that always require approval
 */
export const DANGEROUS_PATTERNS = [
  /DELETE FROM/i,
  /DROP TABLE/i,
  /TRUNCATE/i,
  /rm -rf/,
  /sudo/,
  /chmod 777/,
  /curl.*(?!localhost|127\.0\.0\.1)/,  // External URLs
  /wget/,
  /ssh/,
  /scp/
];

/**
 * Check if a command is whitelisted
 */
export function isCommandSafe(command: string): {
  safe: boolean;
  category?: string;
  description?: string;
  requiresApproval: boolean;
} {
  // Check dangerous patterns first
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return {
        safe: false,
        requiresApproval: true
      };
    }
  }

  // Check whitelist patterns
  for (const [, patterns] of Object.entries(SAFE_COMMANDS)) {
    for (const { pattern, category, description } of patterns) {
      if (pattern.test(command)) {
        return {
          safe: true,
          category,
          description,
          requiresApproval: false
        };
      }
    }
  }

  // Default: requires approval
  return {
    safe: false,
    requiresApproval: true
  };
}

/**
 * Get all whitelisted patterns
 */
export function getWhitelist(): Record<string, string[]> {
  const whitelist: Record<string, string[]> = {};
  
  for (const [key, patterns] of Object.entries(SAFE_COMMANDS)) {
    whitelist[key] = patterns.map(p => p.description);
  }
  
  return whitelist;
}