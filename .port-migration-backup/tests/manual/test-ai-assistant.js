const axios = require("axios");

const AI_URL = "http://localhost:4200";

async function testAIAssistant() {
  try {
    console.log("=== ทดสอบ AI Assistant Service ===\n");

    // 1. Health Check
    console.log("1. ตรวจสอบสถานะ Service...");
    const healthRes = await axios.get(`${AI_URL}/health`);
    console.log("✅ Service Status:", healthRes.data.status);
    console.log("   Mode:", healthRes.data.mode);

    // 2. สร้าง Chat Session
    console.log("\n2. สร้าง Chat Session...");
    const sessionRes = await axios.post(`${AI_URL}/api/v1/chat/sessions`, {
      userId: "test-user-thai",
    });
    const sessionId = sessionRes.data.data.id;
    console.log("✅ Session Created:", sessionId);

    // 3. ส่งข้อความภาษาไทย
    console.log("\n3. ทดสอบส่งข้อความ...");

    const messages = [
      "สวัสดีครับ",
      "ช่วยแนะนำหุ้นไทยที่น่าลงทุนหน่อย",
      "วิเคราะห์หุ้น PTT ให้หน่อย",
    ];

    for (const message of messages) {
      console.log(`\n   👤 User: ${message}`);

      const msgRes = await axios.post(
        `${AI_URL}/api/v1/chat/sessions/${sessionId}/messages`,
        {
          message,
        },
      );

      console.log(
        `   🤖 AI: ${msgRes.data.data.message.content.substring(0, 100)}...`,
      );

      // รอสักครู่ระหว่างข้อความ
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 4. ดึงประวัติการสนทนา
    console.log("\n4. ดึงประวัติการสนทนา...");
    const historyRes = await axios.get(
      `${AI_URL}/api/v1/chat/sessions/${sessionId}`,
    );
    console.log(
      `✅ จำนวนข้อความทั้งหมด: ${historyRes.data.data.messages.length} ข้อความ`,
    );

    // 5. แสดงประวัติการสนทนา
    console.log("\n5. ประวัติการสนทนา:");
    historyRes.data.data.messages.forEach((msg, index) => {
      const icon = msg.role === "user" ? "👤" : "🤖";
      const preview = msg.content.substring(0, 50);
      console.log(`   ${icon} [${msg.role}]: ${preview}...`);
    });

    // 6. ทดสอบ API พื้นฐาน
    console.log("\n6. ทดสอบ Direct Chat API...");
    const directRes = await axios.post(`${AI_URL}/api/v1/chat`, {
      message: "ทดสอบ direct API",
    });
    console.log("✅ Direct Response:", directRes.data.data.response);

    console.log("\n=== ทดสอบเสร็จสมบูรณ์ ===");
    console.log("📊 สรุป:");
    console.log("   - Service Status: OK");
    console.log("   - Session Management: ✅");
    console.log("   - Message Processing: ✅");
    console.log("   - History Retrieval: ✅");
    console.log("   - Direct API: ✅");
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

// รันการทดสอบ
testAIAssistant();
