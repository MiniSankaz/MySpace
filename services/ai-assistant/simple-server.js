const express = require("express");
const app = express();
const PORT = 4200;

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    service: "ai-assistant",
    status: "OK",
    mode: "mock",
    timestamp: new Date().toISOString(),
  });
});

// Mock chat endpoint
app.post("/api/v1/chat", async (req, res) => {
  const { message } = req.body;

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  res.json({
    success: true,
    data: {
      response: `Mock AI response to: "${message}"`,
      timestamp: new Date().toISOString(),
    },
  });
});

// Mock chat sessions
const sessions = new Map();

app.post("/api/v1/chat/sessions", (req, res) => {
  const sessionId = Math.random().toString(36).substring(7);
  const session = {
    id: sessionId,
    userId: req.body.userId || "anonymous",
    messages: [],
    createdAt: new Date().toISOString(),
  };

  sessions.set(sessionId, session);

  res.json({
    success: true,
    data: session,
  });
});

app.get("/api/v1/chat/sessions/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: "Session not found",
    });
  }

  res.json({
    success: true,
    data: session,
  });
});

app.post("/api/v1/chat/sessions/:sessionId/messages", async (req, res) => {
  const session = sessions.get(req.params.sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: "Session not found",
    });
  }

  const { message } = req.body;

  // Add user message
  session.messages.push({
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  });

  // Simulate AI processing
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Add AI response
  const aiResponse = {
    role: "assistant",
    content: `Mock AI response: I received your message "${message}". This is a test response from the mock AI Assistant service running on port ${PORT}.`,
    timestamp: new Date().toISOString(),
  };

  session.messages.push(aiResponse);

  res.json({
    success: true,
    data: {
      message: aiResponse,
      sessionId: req.params.sessionId,
    },
  });
});

app.listen(PORT, () => {
  console.log(`✅ Mock AI Assistant service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
