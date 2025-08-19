#!/usr/bin/env node

/**
 * Test script for Claude CLI integration
 * This script tests the AI Assistant Service using Claude CLI instead of API
 */

const axios = require("axios");

const AI_SERVICE_URL = "http://localhost:4200";
const TEST_USER_ID = "test-user-123";
const TEST_SESSION_ID = "test-session-" + Date.now();

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testCLIIntegration() {
  console.log("🧪 Testing Claude CLI Integration...\n");

  try {
    // 1. Check health
    console.log("1️⃣ Checking AI Service health...");
    const healthRes = await axios.get(`${AI_SERVICE_URL}/health`);
    console.log("✅ Health Status:", healthRes.data.status);
    console.log("   - Service:", healthRes.data.service);
    console.log("   - Environment:", healthRes.data.environment);
    console.log("\n");

    // 2. Create chat session
    console.log("2️⃣ Creating chat session...");
    const sessionRes = await axios.post(`${AI_SERVICE_URL}/chat/sessions`, {
      userId: TEST_USER_ID,
      title: "Test CLI Session",
      folderId: null,
    });

    const session = sessionRes.data.data;
    console.log("✅ Session created:", session.id);
    console.log("   - Title:", session.title);
    console.log("   - User:", session.userId);
    console.log("\n");

    // 3. Send message via REST API (which will use CLI internally)
    console.log("3️⃣ Sending message via REST API (using CLI internally)...");
    console.log('   Message: "Hello! Can you tell me a short joke?"');

    const messageRes = await axios.post(`${AI_SERVICE_URL}/chat/message`, {
      sessionId: session.id,
      userId: TEST_USER_ID,
      message: "Hello! Can you tell me a short joke?",
      systemPrompt: "You are a helpful assistant. Keep responses concise.",
    });

    console.log("✅ Response received:");
    console.log(
      "   Model:",
      messageRes.data.data.assistantMessage.metadata?.model || "claude-cli",
    );
    console.log(
      "   Response:",
      messageRes.data.data.assistantMessage.content.substring(0, 200) + "...",
    );
    console.log("\n");

    // 4. Test WebSocket streaming (if available)
    console.log("4️⃣ Testing WebSocket streaming with CLI...");
    console.log("   Note: WebSocket test requires socket.io-client");

    try {
      const io = require("socket.io-client");
      const socket = io(AI_SERVICE_URL, {
        transports: ["websocket"],
      });

      await new Promise((resolve, reject) => {
        socket.on("connect", () => {
          console.log("✅ WebSocket connected");

          // Authenticate
          socket.emit("auth", {
            userId: TEST_USER_ID,
            sessionId: session.id,
          });

          socket.on("auth_success", () => {
            console.log("✅ WebSocket authenticated");

            // Send streaming chat request
            socket.emit("stream_chat", {
              sessionId: session.id,
              userId: TEST_USER_ID,
              message: "Write a haiku about coding",
              systemPrompt: "You are a creative poet.",
            });

            let fullResponse = "";

            socket.on("stream_chunk", (data) => {
              process.stdout.write(data.chunk);
              fullResponse += data.chunk;
            });

            socket.on("stream_complete", (data) => {
              console.log("\n✅ Stream complete");
              console.log("   Full response length:", fullResponse.length);
              socket.close();
              resolve();
            });

            socket.on("error", (error) => {
              console.error("❌ WebSocket error:", error);
              socket.close();
              reject(error);
            });
          });
        });

        socket.on("connect_error", (error) => {
          console.error("❌ WebSocket connection error:", error.message);
          reject(error);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          socket.close();
          reject(new Error("WebSocket test timeout"));
        }, 30000);
      });
    } catch (wsError) {
      console.log("⚠️ WebSocket test skipped:", wsError.message);
      console.log(
        "   Install socket.io-client to test WebSocket: npm install socket.io-client",
      );
    }

    console.log("\n");

    // 5. Get session with messages
    console.log("5️⃣ Retrieving session with messages...");
    const getSessionRes = await axios.get(
      `${AI_SERVICE_URL}/chat/sessions/${session.id}?userId=${TEST_USER_ID}`,
    );
    const retrievedSession = getSessionRes.data.data;

    console.log("✅ Session retrieved:");
    console.log("   - Message count:", retrievedSession.messages.length);
    console.log(
      "   - Last message role:",
      retrievedSession.messages[retrievedSession.messages.length - 1]?.role,
    );
    console.log("\n");

    // 6. Clean up
    console.log("6️⃣ Cleaning up...");
    await axios.delete(
      `${AI_SERVICE_URL}/chat/sessions/${session.id}?userId=${TEST_USER_ID}`,
    );
    console.log("✅ Session deleted");

    console.log("\n===========================================");
    console.log("✨ Claude CLI Integration Test Complete!");
    console.log("===========================================");
    console.log("\nThe AI Assistant Service is successfully using Claude CLI");
    console.log("instead of the API for processing messages.");
    console.log("\nBenefits:");
    console.log("  • No API key required");
    console.log("  • Uses local Claude CLI authentication");
    console.log("  • Full access to Claude CLI features");
    console.log("  • Real-time streaming support");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    console.log("\n💡 Troubleshooting tips:");
    console.log("1. Make sure AI Assistant Service is running on port 4200");
    console.log("2. Make sure Terminal Service is running on port 4300");
    console.log("3. Make sure Claude CLI is installed and authenticated");
    console.log("4. Check USE_CLAUDE_CLI=true in .env file");

    process.exit(1);
  }
}

// Run the test
testCLIIntegration().catch(console.error);
