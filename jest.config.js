/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: "jsdom",

  // TypeScript support
  preset: "ts-jest",

  // Test file patterns
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/tests/unit/**/*.test.[jt]s?(x)",
    "**/tests/unit/**/*.spec.[jt]s?(x)",
    "**/tests/integration/**/*.test.[jt]s?(x)",
    "**/tests/integration/**/*.spec.[jt]s?(x)",
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
    "/tests/manual/",
    "/tests/e2e/",
    "/services/*/node_modules/",
    "/backup/",
    "/backups/",
  ],

  // Module paths
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
  },

  // Coverage configuration
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.{js,ts}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{js,ts}",
    "!src/**/*.spec.{js,ts}",
    "!src/**/index.{js,ts}",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // Transform files
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  // Global settings
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },

  // Timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,
};
