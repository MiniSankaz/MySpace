"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.checkDatabaseConnection = checkDatabaseConnection;
const client_1 = require("@prisma/client");
const globalForPrisma = global;
exports.prisma =
  globalForPrisma.prisma ||
  new client_1.PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    // Add connection pool settings for better resilience
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool configuration
    __internal: {
      engine: {
        connectionTimeout: 20, // 20 seconds timeout
        poolTimeout: 10, // 10 seconds pool timeout
        maxRetries: 3, // Retry 3 times on failure
      },
    },
  });
if (process.env.NODE_ENV !== "production")
  globalForPrisma.prisma = exports.prisma;
// Add connection check with retry logic
async function checkDatabaseConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await exports.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000),
        );
      }
    }
  }
  return false;
}
exports.default = exports.prisma;
