#!/usr/bin/env node

/**
 * Script to generate NEXTAUTH_SECRET
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

console.log("🔐 NextAuth Secret Generator\n");

// Generate secret
const secret = crypto.randomBytes(32).toString("base64");

console.log("Generated NEXTAUTH_SECRET:");
console.log("━".repeat(50));
console.log(secret);
console.log("━".repeat(50));

// Check if .env.local exists
const envPath = path.join(process.cwd(), ".env.local");
const envExamplePath = path.join(process.cwd(), ".env.example");

console.log("\n📝 Add these lines to your .env.local file:\n");
console.log(`# NextAuth Configuration`);
console.log(`NEXTAUTH_URL=http://localhost:4000`);
console.log(`NEXTAUTH_SECRET=${secret}`);

// Ask if user wants to append to .env.local
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  "\nDo you want to add these to .env.local automatically? (y/n): ",
  (answer) => {
    if (answer.toLowerCase() === "y") {
      try {
        // Read existing content
        let existingContent = "";
        if (fs.existsSync(envPath)) {
          existingContent = fs.readFileSync(envPath, "utf8");
        }

        // Check if NEXTAUTH_SECRET already exists
        if (existingContent.includes("NEXTAUTH_SECRET=")) {
          console.log("\n⚠️  NEXTAUTH_SECRET already exists in .env.local");
          console.log("Please update it manually if needed.");
        } else {
          // Append new variables
          const newContent = `

# NextAuth Configuration (Generated ${new Date().toISOString()})
NEXTAUTH_URL=http://localhost:4000
NEXTAUTH_SECRET=${secret}
`;
          fs.appendFileSync(envPath, newContent);
          console.log("\n✅ Successfully added to .env.local");
        }

        // Also create/update .env.example
        if (!fs.existsSync(envExamplePath)) {
          const exampleContent = `# NextAuth Configuration
NEXTAUTH_URL=http://localhost:4000
NEXTAUTH_SECRET=your-secret-key-here

# Database
DATABASE_URL=your-database-url

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
`;
          fs.writeFileSync(envExamplePath, exampleContent);
          console.log("✅ Created .env.example file");
        }
      } catch (error) {
        console.error("\n❌ Error writing to file:", error.message);
      }
    } else {
      console.log("\n📋 Please copy and paste the configuration manually.");
    }

    console.log("\n🔒 Security Tips:");
    console.log("   • Never commit .env.local to git");
    console.log("   • Use different secrets for development and production");
    console.log("   • Store production secrets in environment variables");
    console.log("   • Rotate secrets regularly");

    rl.close();
  },
);

rl.on("close", () => {
  console.log("\n✨ Done!");
  process.exit(0);
});
