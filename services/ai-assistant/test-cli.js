// Test script to verify Claude CLI integration
const axios = require("axios");
const { getPortConfig, getServiceUrl, getFrontendPort, getGatewayPort } = require('@/shared/config/ports.cjs');
const portConfig = getPortConfig();

const BASE_URL = "http://${getServiceUrl("aiAssistant")}";

async function testClaudeCLI() {
  try {
    console.log("1. Testing health endpoint...");
    const health = await axios.get(`${BASE_URL}/health`);
    console.log("Health check:", health.data.status);

    console.log("\n2. Creating Claude CLI session...");
    const sessionRes = await axios.post(`${BASE_URL}/chat-cli/sessions`, {
      userId: "test-user-123",
    });
    console.log("Session created:", sessionRes.data);

    const sessionId = sessionRes.data.data.sessionId;

    console.log("\n3. Sending test message...");
    const messageRes = await axios.post(
      `${BASE_URL}/chat-cli/sessions/${sessionId}/messages`,
      {
        message: "Hello Claude CLI!",
      },
      {
        responseType: "stream",
      },
    );

    console.log("Streaming response:");
    messageRes.data.on("data", (chunk) => {
      const lines = chunk.toString().split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              process.stdout.write(data.content);
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    });

    messageRes.data.on("end", () => {
      console.log("\n\nStreaming complete!");
    });
  } catch (error) {
    console.error("Test failed:", error.response?.data || error.message);
  }
}

// Run test
testClaudeCLI();
