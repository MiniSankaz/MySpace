// Load env before anything else
require("dotenv").config();

console.log("Environment variables loaded:");
console.log("CLAUDE_API_KEY:", process.env.CLAUDE_API_KEY ? "Set" : "Not set");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
console.log("PORT:", process.env.PORT);

// Now start the app
require("tsx/register");
require("./src/index.ts");
