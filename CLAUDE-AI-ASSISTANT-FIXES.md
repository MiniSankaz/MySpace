# AI Assistant System - ปัญหาและแนวทางแก้ไข

## ปัญหาหลักที่พบ

### 1. Database Schema Inconsistency

**ปัญหา:** มี 3 models ที่ทำหน้าที่คล้ายกันแต่ไม่เชื่อมโยงกัน

- `AssistantChatSession` + `AssistantChatMessage` (ใช้งานจริง)
- `AssistantConversation` + `AssistantMessage` (legacy, ควรลบ)
- `AssistantFolder` (ไม่มี relationship กับ chat sessions)

**แก้ไข:** ปรับ schema ให้สอดคล้องกัน

```prisma
model AssistantChatSession {
  id              String                 @id @default(uuid())
  userId          String
  sessionName     String?
  folderId        String?               // เพิ่มการเชื่อมโยง folder
  model           String
  temperature     Float                  @default(0.7)
  maxTokens       Int                    @default(4096)
  totalTokensUsed Int                    @default(0)
  totalCost       Float                  @default(0)
  metadata        Json?
  startedAt       DateTime               @default(now())
  lastActiveAt    DateTime               @updatedAt
  endedAt         DateTime?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt
  messages        AssistantChatMessage[]
  User            User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  Folder          AssistantFolder?       @relation(fields: [folderId], references: [id])  // เพิ่ม relation

  @@index([userId])
  @@index([folderId])
  @@index([lastActiveAt])
}

model AssistantFolder {
  id            String                  @id @default(uuid())
  userId        String
  name          String
  color         String?                 @default("#3B82F6")
  icon          String?                 @default("folder")
  order         Int                     @default(0)
  createdAt     DateTime                @default(now())
  updatedAt     DateTime                @updatedAt
  sessions      AssistantChatSession[]  // เปลี่ยนจาก conversations เป็น sessions
  User          User                    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name])
  @@index([userId])
}
```

### 2. Session ID Management

**ปัญหา:** Frontend ใช้ timestamp-based sessionId แต่ database ใช้ UUID

**แก้ไข:** ปรับ frontend ให้ใช้ UUID จาก database

```typescript
// ใน ChatInterfaceWithFolders.tsx
const createNewSession = async () => {
  // ไม่ต้องสร้าง sessionId เอง ให้ API สร้างให้
  setSessionId(""); // Clear current session
  setMessages([]);
  setSuggestions([]);
  // sessionId จะถูกสร้างใหม่เมื่อส่ง message แรก
};

// ใน sendMessage function
const response = await authClient.fetch("/api/assistant/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: userMessage.content,
    sessionId: sessionId || undefined, // ถ้าไม่มีให้ backend สร้างใหม่
    directMode,
  }),
});
```

### 3. API Response Format

**แก้ไข API `/api/assistant/sessions/route.ts`:**

```typescript
// Format sessions ให้ตรงกับ frontend expectation
const sessions = conversations.map((session) => ({
  sessionId: session.id, // ใช้ UUID เป็น sessionId
  title:
    session.sessionName ||
    session.messages[0]?.content?.substring(0, 50) ||
    "New Chat",
  lastMessage: session.messages[0]?.content || "",
  messageCount: session._count.messages,
  createdAt: session.startedAt,
  folderId: session.folderId, // เพิ่ม folderId
}));
```

### 4. Message Loading Fix

**แก้ไข `conversation-storage.ts`:**

```typescript
async loadConversation(
  userId: string,
  sessionId: string
): Promise<Message[]> {
  try {
    const messages = await this.prisma.assistantChatMessage.findMany({
      where: {
        sessionId: sessionId, // sessionId ตอนนี้คือ UUID แล้ว
        userId: userId
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    return messages.map(msg => ({
      id: msg.id,
      userId: msg.userId || userId,
      content: msg.content,
      type: msg.role as 'user' | 'assistant' | 'system',
      timestamp: msg.timestamp,
      metadata: msg.metadata as any
    }));
  } catch (error) {
    console.error('Failed to load conversation:', error);
    return [];
  }
}
```

## ขั้นตอนการแก้ไข

### Phase 1: Database Migration

1. สร้าง migration เพื่อเพิ่ม `folderId` ใน `AssistantChatSession`
2. ลบ models ที่ไม่ใช้: `AssistantConversation`, `AssistantMessage`
3. Update relationships ระหว่าง `AssistantFolder` และ `AssistantChatSession`

### Phase 2: API Updates

1. แก้ไข `/api/assistant/sessions` ให้ส่ง folderId
2. แก้ไข `/api/assistant/folders/[folderId]` ให้โหลด sessions แทน conversations
3. แก้ไข session move API ให้ทำงานกับ AssistantChatSession

### Phase 3: Frontend Updates

1. แก้ไข session creation ให้ใช้ UUID
2. แก้ไข message loading logic
3. แก้ไข folder management ให้ทำงานกับ sessions

### Phase 4: Testing

1. Test session creation และ message saving
2. Test folder operations (create, move, delete)
3. Test message history loading
4. Test session persistence after refresh

## Commands สำหรับแก้ไข

```bash
# 1. Create migration
npx prisma migrate dev --name "fix-assistant-session-folder-relations"

# 2. Generate Prisma client
npx prisma generate

# 3. Restart development server
npm run dev
```

## ไฟล์ที่ต้องแก้ไข

### Database

- `prisma/schema.prisma` - เพิ่ม relations, ลบ legacy models

### API Routes

- `src/app/api/assistant/sessions/route.ts` - แก้ไข response format
- `src/app/api/assistant/folders/[folderId]/route.ts` - โหลด sessions
- `src/app/api/assistant/sessions/[sessionId]/move/route.ts` - ใช้ AssistantChatSession

### Services

- `src/modules/personal-assistant/services/conversation-storage.ts` - แก้ไข query logic
- `src/modules/personal-assistant/services/assistant.service.ts` - แก้ไข session management

### Frontend

- `src/modules/personal-assistant/components/ChatInterfaceWithFolders.tsx` - แก้ไข session handling

## ความสำคัญของการแก้ไข

**ปัญหาปัจจุบัน:**

- Chat history ไม่แสดงเมื่อ refresh
- Session ใหม่ถูกสร้างทุกครั้งที่ส่ง message
- Folder system ไม่ทำงาน
- Message persistence ไม่เสถียร

**หลังแก้ไข:**

- Session ID จะสอดคล้องกันทั้งระบบ
- Messages จะถูก load ถูกต้อง
- Folder management จะทำงานสมบูรณ์
- Chat history จะ persist หลัง refresh
