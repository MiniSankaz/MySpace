// Minimal test to see what's crashing
require('dotenv').config();

console.log('Starting AI Assistant Service test...');
console.log('PORT:', process.env.PORT || 4130);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (local)' : 'Not set');

const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'ai-assistant-test' });
});

const PORT = process.env.PORT || 4130;
app.listen(PORT, () => {
  console.log(`AI Assistant test running on port ${PORT}`);
});