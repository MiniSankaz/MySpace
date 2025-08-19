const axios = require("axios");

const CLAUDE_URL = "http://localhost:4201";

async function testRealClaude() {
  try {
    console.log("=== ทดสอบ Real Claude AI ===\n");

    // 1. Health Check
    console.log("1. ตรวจสอบสถานะ Service...");
    const healthRes = await axios.get(`${CLAUDE_URL}/health`);
    console.log("✅ Service Status:", healthRes.data.status);
    console.log("   Mode:", healthRes.data.mode);

    // 2. ทดสอบคำถามภาษาไทย
    console.log("\n2. ทดสอบถาม Claude เรื่อง Stock Portfolio...\n");

    const questions = [
      "สวัสดีครับ ช่วยแนะนำ 3 features สำคัญสำหรับระบบ Stock Portfolio Management หน่อย",
      "ถ้าจะทำ real-time price update ควรใช้เทคโนโลยีอะไร",
    ];

    for (const question of questions) {
      console.log(`👤 คำถาม: ${question}\n`);

      const startTime = Date.now();
      const response = await axios.post(
        `${CLAUDE_URL}/api/v1/chat`,
        {
          message: question,
        },
        {
          timeout: 30000, // 30 seconds timeout
        },
      );

      const responseTime = Date.now() - startTime;
      console.log(`🤖 Claude ตอบ (ใช้เวลา ${responseTime / 1000}s):\n`);
      console.log(response.data.data.response);
      console.log("\n" + "=".repeat(80) + "\n");
    }

    // 3. ทดสอบ Streaming
    console.log("3. ทดสอบ Streaming Response...\n");

    const streamRes = await axios.post(
      `${CLAUDE_URL}/api/v1/chat/stream`,
      {
        message: "อธิบายสั้นๆ ว่า WebSocket คืออะไร",
      },
      {
        responseType: "stream",
      },
    );

    console.log("🤖 Claude Streaming:");
    streamRes.data.on("data", (chunk) => {
      const lines = chunk.toString().split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              process.stdout.write(data.content);
            }
            if (data.done) {
              console.log("\n\n✅ Streaming complete");
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });

    await new Promise((resolve) => {
      streamRes.data.on("end", resolve);
    });

    console.log("\n=== ทดสอบเสร็จสมบูรณ์ ===");
    console.log("📊 สรุป:");
    console.log("   - Claude CLI: ✅ ทำงานได้");
    console.log("   - ตอบคำถามภาษาไทย: ✅");
    console.log("   - Streaming Response: ✅");
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

// รันการทดสอบ
testRealClaude();
