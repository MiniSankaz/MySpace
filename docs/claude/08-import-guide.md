# Import Guide

## Services

### Core Services
```typescript
// Dashboard service
import { DashboardService } from '@/services/dashboard.service';

// Claude AI services
import { ClaudeDirectService } from '@/services/claude-direct.service';
import { ClaudeEnhancedService } from '@/services/claude-enhanced.service';
import { ClaudeRealtimeService } from '@/services/claude-realtime.service';

// Terminal service
import { TerminalService } from '@/services/terminal.service';

// Cache manager
import { CacheManager } from '@/core/database/cache-manager';
```

### Module Services
```typescript
// User services
import { UserService } from '@/modules/ums/services/user.service';
import { AuthService } from '@/modules/ums/services/auth.service';

// AI Assistant services
import { ConversationStorage } from '@/modules/personal-assistant/services/conversation-storage';

// Workspace services
import { WorkspaceService } from '@/modules/workspace/services/workspace.service';
```

## Components

### UI Components
```typescript
// Basic UI components (always from ui folder)
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger 
} from '@/components/ui/select';
```

### Module Components
```typescript
// AI Assistant components
import { ChatInterfaceWithFolders } from '@/modules/personal-assistant/components/ChatInterfaceWithFolders';

// Terminal components
import TerminalContainerV2 from '@/modules/workspace/components/Terminal/TerminalContainerV2';
import XTermViewV2 from '@/modules/workspace/components/Terminal/XTermViewV2';

// Workspace components
import { FileExplorer } from '@/modules/workspace/components/Sidebar/FileExplorer';
import { WorkspaceLayout } from '@/modules/workspace/components/Layout/WorkspaceLayout';
```

## Utilities

### Core Utilities
```typescript
// Logger
import { logger } from '@/core/utils/logger';

// Authentication
import { authClient } from '@/core/auth/auth-client';
import { verifyAuth } from '@/middleware/auth';

// Database
import { prisma } from '@/core/database/prisma';
import { DBManager } from '@/core/database/db-manager';

// Security
import { hashPassword, verifyPassword } from '@/core/security/password';
import { generateJWT, verifyJWT } from '@/core/security/jwt';
```

### Type Imports
```typescript
// Prisma types
import type { User, Session, Project } from '@prisma/client';

// Custom types
import type { ApiResponse } from '@/types/api';
import type { TerminalSession } from '@/modules/workspace/types/terminal';
import type { WorkspaceProject } from '@/modules/workspace/types/workspace';
```

## Hooks

### Custom Hooks
```typescript
// Authentication hook
import { useAuth } from '@/hooks/useAuth';

// WebSocket hook
import { useWebSocket } from '@/hooks/useWebSocket';

// Toast notifications
import { useToast } from '@/components/ui/use-toast';

// Terminal store
import { useTerminalStore } from '@/modules/workspace/stores/terminal.store';
```

## Icons

### Lucide Icons
```typescript
import { 
  Terminal, 
  Plus, 
  X, 
  Settings, 
  User,
  FileText,
  Folder,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
```

## Environment Variables

### Client-side (NEXT_PUBLIC_*)
```typescript
// Available in browser
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
```

### Server-side
```typescript
// Only available on server
const dbUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const claudeApiKey = process.env.ANTHROPIC_API_KEY;
```

## Path Aliases

### Configured Aliases
```json
{
  "@/*": ["src/*"],
  "@/components/*": ["src/components/*"],
  "@/modules/*": ["src/modules/*"],
  "@/services/*": ["src/services/*"],
  "@/core/*": ["src/core/*"],
  "@/hooks/*": ["src/hooks/*"],
  "@/types/*": ["src/types/*"],
  "@/utils/*": ["src/utils/*"]
}
```

## Import Order Convention

```typescript
// 1. React/Next.js imports
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { motion } from 'framer-motion';
import { z } from 'zod';

// 3. UI components
import { Button } from '@/components/ui/button';

// 4. Module components
import { TerminalContainer } from '@/modules/terminal/components';

// 5. Services and utilities
import { TerminalService } from '@/services/terminal.service';
import { logger } from '@/core/utils/logger';

// 6. Types
import type { TerminalSession } from '@/types/terminal';

// 7. Styles
import styles from './Component.module.css';
```