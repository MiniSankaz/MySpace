const axios = require("axios");

const TERMINAL_URL = "http://localhost:4300";

async function testTerminal() {
  try {
    console.log("1. สร้าง Terminal Session...");
    const sessionRes = await axios.post(`${TERMINAL_URL}/api/v1/terminals`, {
      projectId: "test-project",
      shell: "/bin/bash",
      cols: 80,
      rows: 24,
    });

    const sessionId = sessionRes.data.data.sessionId;
    console.log(`✅ Session created: ${sessionId}`);

    console.log("\n2. รัน command: ls -la");
    await axios.post(`${TERMINAL_URL}/api/v1/terminals/${sessionId}/input`, {
      data: "ls -la\n",
    });

    // รอให้ command ทำงาน
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("\n3. ดึงผลลัพธ์");
    const outputRes = await axios.get(
      `${TERMINAL_URL}/api/v1/terminals/${sessionId}/output`,
    );
    console.log("Output:", outputRes.data.data.output);

    console.log("\n4. รัน command: pwd");
    await axios.post(`${TERMINAL_URL}/api/v1/terminals/${sessionId}/input`, {
      data: "pwd\n",
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const output2Res = await axios.get(
      `${TERMINAL_URL}/api/v1/terminals/${sessionId}/output`,
    );
    console.log("Output:", output2Res.data.data.output);

    console.log("\n5. ปิด Terminal Session");
    await axios.delete(`${TERMINAL_URL}/api/v1/terminals/${sessionId}`);
    console.log("✅ Session closed");
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

testTerminal();
