/**
 * Terminal API Test Script
 * วิเคราะห์ปัญหาที่ Terminal sessions ไม่แสดงบน UI
 */

const fetch = require("node-fetch");

const BASE_URL = "http://localhost:4000";
const PROJECT_ID = "test-project-123";

// Mock credentials for testing
const TEST_COOKIE =
  "accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.test-signature";

async function testAPI() {
  console.log("🧪 Testing Terminal API Endpoints...\n");

  try {
    // Test 1: List existing sessions
    console.log("1️⃣ Testing GET /api/terminal/list");
    const listResponse = await fetch(
      `${BASE_URL}/api/terminal/list?projectId=${PROJECT_ID}`,
      {
        headers: {
          Cookie: TEST_COOKIE,
        },
      },
    );

    const listResult = await listResponse.json();
    console.log("   Status:", listResponse.status);
    console.log("   Response:", JSON.stringify(listResult, null, 2));
    console.log("");

    // Test 2: Create new system terminal session
    console.log("2️⃣ Testing POST /api/terminal/create (system)");
    const createSystemResponse = await fetch(
      `${BASE_URL}/api/terminal/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: TEST_COOKIE,
        },
        body: JSON.stringify({
          projectId: PROJECT_ID,
          type: "system",
          projectPath: "/Users/sem4pro/Stock/port",
        }),
      },
    );

    const createSystemResult = await createSystemResponse.json();
    console.log("   Status:", createSystemResponse.status);
    console.log("   Response:", JSON.stringify(createSystemResult, null, 2));
    console.log("");

    // Test 3: Create new Claude terminal session
    console.log("3️⃣ Testing POST /api/terminal/create (claude)");
    const createClaudeResponse = await fetch(
      `${BASE_URL}/api/terminal/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: TEST_COOKIE,
        },
        body: JSON.stringify({
          projectId: PROJECT_ID,
          type: "claude",
          projectPath: "/Users/sem4pro/Stock/port",
        }),
      },
    );

    const createClaudeResult = await createClaudeResponse.json();
    console.log("   Status:", createClaudeResponse.status);
    console.log("   Response:", JSON.stringify(createClaudeResult, null, 2));
    console.log("");

    // Test 4: List sessions again to see if they appear
    console.log("4️⃣ Testing GET /api/terminal/list (after creation)");
    const listAfterResponse = await fetch(
      `${BASE_URL}/api/terminal/list?projectId=${PROJECT_ID}`,
      {
        headers: {
          Cookie: TEST_COOKIE,
        },
      },
    );

    const listAfterResult = await listAfterResponse.json();
    console.log("   Status:", listAfterResponse.status);
    console.log("   Response:", JSON.stringify(listAfterResult, null, 2));
    console.log("");

    // Analysis
    console.log("📊 ANALYSIS:");
    console.log("=".repeat(50));

    if (createSystemResult.success && createClaudeResult.success) {
      console.log("✅ Terminal sessions created successfully in database");

      if (listAfterResult.sessions && listAfterResult.sessions.length > 0) {
        console.log("✅ Terminal sessions returned by list API");
        console.log(`   Found ${listAfterResult.sessions.length} sessions:`);
        listAfterResult.sessions.forEach((session, index) => {
          console.log(
            `   ${index + 1}. ${session.type} terminal - ${session.tabName} (${session.id})`,
          );
        });
      } else {
        console.log("❌ Terminal sessions NOT returned by list API");
        console.log(
          "   This indicates a problem with the list endpoint or data format",
        );
      }
    } else {
      console.log("❌ Failed to create terminal sessions");
      console.log("   Create System Result:", createSystemResult);
      console.log("   Create Claude Result:", createClaudeResult);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("   Stack:", error.stack);
  }
}

// Run the test
testAPI().catch(console.error);
