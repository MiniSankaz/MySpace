const { spawn } = require("child_process");
const express = require("express");
const app = express();
const PORT = 4201;

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    service: "ai-assistant-real",
    status: "OK",
    mode: "claude-cli",
    timestamp: new Date().toISOString(),
  });
});

// Real Claude chat endpoint
app.post("/api/v1/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: "Message is required",
    });
  }

  try {
    console.log("📨 Sending to Claude:", message);

    // Use Claude CLI
    const claude = spawn("claude", ["chat"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let response = "";
    let error = "";

    // Collect output
    claude.stdout.on("data", (data) => {
      response += data.toString();
    });

    claude.stderr.on("data", (data) => {
      error += data.toString();
    });

    // Send message to Claude
    claude.stdin.write(message + "\n");
    claude.stdin.end();

    // Wait for response
    await new Promise((resolve, reject) => {
      claude.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Claude exited with code ${code}: ${error}`));
        } else {
          resolve();
        }
      });

      claude.on("error", (err) => {
        reject(err);
      });
    });

    console.log("✅ Claude responded");

    res.json({
      success: true,
      data: {
        response: response.trim(),
        timestamp: new Date().toISOString(),
        model: "claude-cli",
      },
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Chat with streaming
app.post("/api/v1/chat/stream", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: "Message is required",
    });
  }

  // Setup SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    console.log("📨 Streaming to Claude:", message);

    const claude = spawn("claude", ["chat"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Stream output
    claude.stdout.on("data", (data) => {
      const chunk = data.toString();
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    });

    claude.stderr.on("data", (data) => {
      console.error("Claude error:", data.toString());
    });

    // Send message
    claude.stdin.write(message + "\n");
    claude.stdin.end();

    claude.on("close", (code) => {
      res.write(`data: ${JSON.stringify({ done: true, code })}\n\n`);
      res.end();
    });

    claude.on("error", (err) => {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Real Claude AI Assistant service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Using Claude CLI for real AI responses`);
});
