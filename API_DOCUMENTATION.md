# Personal AI Assistant API Documentation

## Overview

The Personal AI Assistant API provides programmatic access to Claude AI capabilities through a secure REST API. This allows you to integrate AI assistance into your applications, automation workflows, and development tools.

## Base URL

```
https://your-domain.com/api/v1
```

For local development:
```
http://localhost:4000/api/v1
```

## Authentication

All API requests require authentication using an API token. You can create and manage API tokens from the dashboard at `/api-keys`.

### Using API Tokens

Include your API token in the request headers:

```bash
# Using Authorization header (recommended)
Authorization: Bearer sk-live-your-api-token-here

# Or using X-API-Key header
X-API-Key: sk-live-your-api-token-here
```

### Example Request

```bash
curl -X POST https://your-domain.com/api/v1/assistant/chat \
  -H "Authorization: Bearer sk-live-your-api-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how can I help with my React project?"
  }'
```

## API Scopes

API tokens can be configured with specific scopes to limit access:

| Scope | Description |
|-------|-------------|
| `assistant:read` | Read assistant conversations and history |
| `assistant:write` | Send messages to the assistant |
| `assistant:delete` | Delete assistant sessions |
| `projects:read` | View project information |
| `projects:write` | Create and modify projects |
| `terminal:read` | View terminal logs |
| `terminal:execute` | Execute terminal commands |
| `analytics:read` | View usage analytics |
| `*` | Full access to all endpoints |

## Rate Limiting

API requests are rate-limited based on your token configuration. Default limit is 1000 requests per hour.

Rate limit information is included in response headers:
- `X-RateLimit-Limit`: Maximum requests per hour
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

## Endpoints

### Assistant Chat

#### Send a Message

Send a message to the AI assistant and receive a response.

**Endpoint:** `POST /assistant/chat`

**Required Scope:** `assistant:write`

**Request Body:**
```json
{
  "message": "Your message to the assistant",
  "sessionId": "optional-session-id",
  "context": {
    "projectPath": "/path/to/project",
    "files": ["file1.js", "file2.tsx"],
    "history": [
      {
        "role": "user",
        "content": "Previous message"
      },
      {
        "role": "assistant",
        "content": "Previous response"
      }
    ]
  },
  "options": {
    "temperature": 0.7,
    "maxTokens": 4000,
    "stream": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session-123",
  "response": {
    "content": "Assistant's response here...",
    "role": "assistant",
    "timestamp": "2024-01-09T10:30:00Z"
  },
  "usage": {
    "inputTokens": 150,
    "outputTokens": 200,
    "totalTokens": 350
  }
}
```

#### Get Chat History

Retrieve conversation history for a session.

**Endpoint:** `GET /assistant/chat?sessionId={sessionId}&limit={limit}`

**Required Scope:** `assistant:read`

**Response:**
```json
{
  "success": true,
  "sessionId": "session-123",
  "messages": [
    {
      "role": "user",
      "content": "User message",
      "timestamp": "2024-01-09T10:29:00Z"
    },
    {
      "role": "assistant",
      "content": "Assistant response",
      "timestamp": "2024-01-09T10:29:30Z"
    }
  ],
  "metadata": {
    "title": "React Project Help",
    "createdAt": "2024-01-09T10:00:00Z",
    "updatedAt": "2024-01-09T10:30:00Z",
    "messageCount": 10
  }
}
```

### Sessions Management

#### List Sessions

Get all chat sessions for the authenticated user.

**Endpoint:** `GET /assistant/sessions?limit={limit}&offset={offset}`

**Required Scope:** `assistant:read`

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session-123",
      "title": "React Project Help",
      "createdAt": "2024-01-09T10:00:00Z",
      "updatedAt": "2024-01-09T10:30:00Z",
      "messageCount": 10,
      "lastMessage": {
        "role": "assistant",
        "content": "Last message preview...",
        "timestamp": "2024-01-09T10:30:00Z"
      }
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Delete Session

Delete a chat session and all its messages.

**Endpoint:** `DELETE /assistant/sessions?sessionId={sessionId}`

**Required Scope:** `assistant:delete`

**Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

## Code Examples

### JavaScript/TypeScript

```typescript
// Using fetch
async function sendMessage(message: string) {
  const response = await fetch('https://your-domain.com/api/v1/assistant/chat', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sk-live-your-api-token-here',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: message,
      sessionId: 'my-session-123'
    })
  });

  const data = await response.json();
  console.log('Assistant:', data.response.content);
}

// Using axios
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-domain.com/api/v1',
  headers: {
    'Authorization': 'Bearer sk-live-your-api-token-here'
  }
});

async function chat(message: string) {
  const { data } = await api.post('/assistant/chat', {
    message: message
  });
  return data.response.content;
}
```

### Python

```python
import requests

API_KEY = 'sk-live-your-api-token-here'
BASE_URL = 'https://your-domain.com/api/v1'

def send_message(message, session_id=None):
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'message': message,
        'sessionId': session_id
    }
    
    response = requests.post(
        f'{BASE_URL}/assistant/chat',
        json=payload,
        headers=headers
    )
    
    data = response.json()
    return data['response']['content']

# Usage
response = send_message("Help me with Python async programming")
print(response)
```

### cURL

```bash
# Send a message
curl -X POST https://your-domain.com/api/v1/assistant/chat \
  -H "Authorization: Bearer sk-live-your-api-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain React hooks",
    "sessionId": "session-123"
  }'

# Get chat history
curl -X GET "https://your-domain.com/api/v1/assistant/chat?sessionId=session-123&limit=10" \
  -H "Authorization: Bearer sk-live-your-api-token-here"

# List sessions
curl -X GET "https://your-domain.com/api/v1/assistant/sessions?limit=20" \
  -H "Authorization: Bearer sk-live-your-api-token-here"
```

## Error Handling

The API uses standard HTTP status codes:

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": "Error message",
  "details": {
    "field": "Additional error details"
  }
}
```

## Webhooks (Coming Soon)

Configure webhooks to receive real-time notifications about assistant events:

- `assistant.message` - New message in conversation
- `assistant.session.created` - New session created
- `assistant.session.deleted` - Session deleted
- `task.completed` - Background task completed

## SDK Libraries (Coming Soon)

Official SDK libraries will be available for:
- JavaScript/TypeScript (npm)
- Python (pip)
- Go
- Ruby
- PHP

## Support

For API support and questions:
- Documentation: https://your-domain.com/docs/api
- GitHub Issues: https://github.com/your-org/api-issues
- Email: api-support@your-domain.com

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Assistant chat endpoints
- Session management
- API token authentication
- Rate limiting