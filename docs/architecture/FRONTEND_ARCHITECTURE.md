# Frontend Architecture Document

## Stock Portfolio Management System v3.0

### Document Information

- **Version**: 1.0
- **Date**: 2025-08-15
- **Project**: Stock Portfolio Management System v3.0
- **Document Type**: Technical Architecture Document
- **Status**: Final
- **Dependencies**: Business Requirements Document, Functional Requirements Document

---

## Executive Summary

The Frontend Architecture for Stock Portfolio Management System v3.0 is designed to support a unified, AI-powered platform that combines professional trading capabilities, development workspace management, and intelligent assistance. This architecture emphasizes scalability, real-time performance, mobile-first design, and microservices integration.

### Key Architectural Decisions

- **Framework**: Next.js 15.4.5 with React 19 and TypeScript for type safety
- **Architecture Pattern**: Microfrontend-inspired modular architecture with API Gateway integration
- **State Management**: Zustand for global state with persistent storage
- **Styling**: Tailwind CSS with shadcn/ui component library for consistency
- **Real-time**: WebSocket integration for live features across all modules
- **Mobile Strategy**: Progressive Web App (PWA) + Flutter companion app

---

## System Architecture

### High-Level Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Web Client    │  │  Progressive    │  │   Flutter       │  │
│  │ (Next.js 15.4.5)│  │   Web App       │  │  Mobile App     │  │
│  │                 │  │     (PWA)       │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                   CLIENT-SIDE ARCHITECTURE                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ Web Core    │ │ Workspace   │ │AI Assistant │ │ Portfolio   │ │
│  │   Module    │ │   Module    │ │   Module    │ │   Module    │ │
│  │             │ │             │ │             │ │             │ │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │
│  │ │Dashboard│ │ │ │Terminal │ │ │ │  Chat   │ │ │ │Analytics│ │ │
│  │ │Auth     │ │ │ │File Mgmt│ │ │ │Knowledge│ │ │ │Trading  │ │ │
│  │ │Navigation│ │ │ │Code Edit│ │ │ │Context  │ │ │ │Alerts   │ │ │
│  │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                   INTEGRATION LAYER                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ API Client  │ │ WebSocket   │ │State Store  │ │ Cache Layer │ │
│  │  (Axios)    │ │  Manager    │ │  (Zustand)  │ │ (React Query)│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                  API GATEWAY & MICROSERVICES                    │
│     Gateway:4110 → User:4100, AI:4130, Terminal:4140,         │
│                    Workspace:4150, Portfolio:4160              │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
Frontend Application
├── Core Infrastructure
│   ├── Authentication & Authorization
│   ├── Route Management (Next.js App Router)
│   ├── State Management (Zustand Stores)
│   ├── API Integration Layer
│   └── WebSocket Connection Manager
├── UI Foundation
│   ├── Design System (Tailwind CSS + shadcn/ui)
│   ├── Layout Components (Responsive Grid)
│   ├── Common UI Components
│   └── Theme Management (Dark/Light)
├── Module Architecture
│   ├── Web Core Module
│   │   ├── Authentication Components
│   │   ├── Dashboard Framework
│   │   ├── Navigation System
│   │   └── User Management
│   ├── Workspace Module
│   │   ├── Project Management
│   │   ├── File Explorer & Editor
│   │   ├── Terminal Integration
│   │   └── Git Integration
│   ├── AI Assistant Module
│   │   ├── Chat Interface
│   │   ├── Conversation Management
│   │   ├── Knowledge Management
│   │   └── Context Integration
│   └── Portfolio Module
│       ├── Dashboard & Analytics
│       ├── Asset Management
│       ├── Trading Interface
│       └── Reporting System
└── Cross-Cutting Concerns
    ├── Error Handling & Logging
    ├── Performance Monitoring
    ├── Security (XSS, CSRF Protection)
    └── Accessibility (WCAG 2.1 AA)
```

### Data Flow Architecture

```
User Interaction → Component → Local State → Global Store → API Client
                                    ↓
Real-time Updates ← WebSocket ← Service ← API Gateway ← Microservice
                                    ↓
Cache Layer (React Query) → Update Global State → Re-render Components
```

### Integration Architecture with Microservices

#### API Gateway Integration Pattern

```typescript
// Centralized API configuration
const API_CONFIG = {
  baseURL: "http://localhost:4110",
  timeout: 10000,
  retries: 3,
  endpoints: {
    auth: "/api/v1/auth",
    users: "/api/v1/users",
    chat: "/api/v1/chat",
    terminal: "/api/v1/terminal",
    workspace: "/api/v1/workspace",
    portfolios: "/api/v1/portfolios",
    stocks: "/api/v1/stocks",
  },
};

// Service routing through API Gateway
class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
    });

    this.setupInterceptors();
    this.setupRetryLogic();
  }

  // All requests route through API Gateway
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    return this.client.request(config);
  }
}
```

#### WebSocket Architecture for Real-time Features

```typescript
// WebSocket connection manager
class WebSocketManager {
  private connections: Map<string, WebSocket> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();

  // Multi-service WebSocket endpoints
  private endpoints = {
    terminal: "ws://localhost:4110/ws/terminal",
    chat: "ws://localhost:4110/ws/chat",
    portfolio: "ws://localhost:4110/ws/portfolio",
  };

  connect(service: string, sessionId: string): WebSocket {
    const url = `${this.endpoints[service]}/${sessionId}`;
    const ws = new WebSocket(url);

    ws.onopen = () => this.handleConnection(service, sessionId);
    ws.onmessage = (event) => this.handleMessage(service, event);
    ws.onclose = () => this.handleDisconnection(service, sessionId);
    ws.onerror = (error) => this.handleError(service, error);

    this.connections.set(`${service}-${sessionId}`, ws);
    return ws;
  }

  private handleReconnection(service: string, sessionId: string) {
    const attempts = this.reconnectAttempts.get(`${service}-${sessionId}`) || 0;

    if (attempts < 5) {
      setTimeout(
        () => {
          this.connect(service, sessionId);
          this.reconnectAttempts.set(`${service}-${sessionId}`, attempts + 1);
        },
        Math.pow(2, attempts) * 1000,
      ); // Exponential backoff
    }
  }
}
```

### State Management Architecture

#### Zustand Store Structure

```typescript
// Global application state
interface AppState {
  // Authentication state
  auth: AuthState;

  // Module states
  dashboard: DashboardState;
  workspace: WorkspaceState;
  assistant: AssistantState;
  portfolio: PortfolioState;

  // UI state
  ui: UIState;

  // WebSocket connections
  connections: ConnectionState;
}

// Modular store pattern
const useAppStore = create<AppState>((set, get) => ({
  auth: createAuthSlice(set, get),
  dashboard: createDashboardSlice(set, get),
  workspace: createWorkspaceSlice(set, get),
  assistant: createAssistantSlice(set, get),
  portfolio: createPortfolioSlice(set, get),
  ui: createUISlice(set, get),
  connections: createConnectionSlice(set, get),
}));

// Persistent storage for critical data
const persistentStore = {
  name: "portfolio-app-storage",
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    auth: {
      isAuthenticated: state.auth.isAuthenticated,
      user: state.auth.user,
    },
    ui: {
      theme: state.ui.theme,
      preferences: state.ui.preferences,
    },
  }),
};
```

---

## Technology Stack

### Core Framework & Runtime

- **Next.js 15.4.5**: App Router for file-based routing and server-side rendering
- **React 19**: Latest React with concurrent features and improved performance
- **TypeScript 5.3+**: Strict mode enabled for type safety and developer experience
- **Node.js 20+**: LTS version for optimal performance and compatibility

### UI Library & Styling

- **Tailwind CSS 3.4+**: Utility-first CSS framework for consistent design
- **shadcn/ui**: High-quality, accessible React components
- **Framer Motion**: Animation library for smooth transitions and micro-interactions
- **React Icons**: Comprehensive icon library
- **Radix UI**: Unstyled, accessible UI primitives

### State Management & Data Fetching

- **Zustand 4.4+**: Lightweight state management with persistence
- **React Query (TanStack Query) 5.0+**: Server state management and caching
- **React Hook Form**: Performant forms with minimal re-renders
- **Zod**: Runtime type validation for forms and API responses

### Real-time & Networking

- **Axios**: HTTP client with interceptors and retry logic
- **WebSocket API**: Native WebSocket for real-time communication
- **Socket.IO (if needed)**: Fallback for WebSocket with additional features
- **EventSource**: Server-Sent Events for one-way real-time updates

### Development Tools

- **ESLint 8.0+**: Code linting with React and TypeScript rules
- **Prettier**: Code formatting for consistency
- **Husky**: Git hooks for pre-commit validation
- **lint-staged**: Run linters on staged files only
- **TypeScript ESLint**: TypeScript-specific linting rules

### Testing Framework

- **Vitest**: Fast unit testing framework
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing framework
- **MSW (Mock Service Worker)**: API mocking for testing
- **@testing-library/jest-dom**: Additional Jest matchers

### Mobile & PWA

- **Flutter 3.19+**: Cross-platform mobile development
- **PWA (Progressive Web App)**: Web-based mobile experience
- **Workbox**: Service worker library for offline functionality
- **Web Push API**: Push notifications for PWA

### Build & Deployment

- **Webpack 5**: Module bundling (via Next.js)
- **SWC**: Fast TypeScript/JavaScript compiler
- **Docker**: Containerization for deployment
- **Vercel**: Deployment platform (recommended)
- **AWS/DigitalOcean**: Alternative deployment options

### Code Quality & Documentation

- **Storybook 7.0+**: Component documentation and development
- **Chromatic**: Visual testing and UI review
- **JSDoc**: Code documentation
- **TypeDoc**: TypeScript documentation generation

---

## Module Structure

### Recommended Directory Structure

```
src/
├── core/                     # Core functionality
│   ├── auth/                # Authentication utilities
│   ├── api/                 # API client and services
│   ├── hooks/               # Global custom hooks
│   ├── utils/               # Utility functions
│   └── types/               # Global TypeScript types
├── modules/                  # Feature modules
│   ├── web-core/            # Web Core Module
│   │   ├── components/      # Module-specific components
│   │   ├── hooks/           # Module-specific hooks
│   │   ├── services/        # Module-specific services
│   │   ├── stores/          # Module-specific Zustand slices
│   │   ├── types/           # Module-specific types
│   │   └── utils/           # Module-specific utilities
│   ├── workspace/           # Workspace Module
│   ├── ai-assistant/        # AI Assistant Module
│   └── portfolio/           # Portfolio Module
├── components/               # Shared components
│   ├── ui/                  # Base UI components (shadcn/ui)
│   ├── layout/              # Layout components
│   ├── forms/               # Form components
│   └── charts/              # Data visualization components
├── hooks/                    # Custom hooks
│   ├── use-api.ts           # API hooks
│   ├── use-websocket.ts     # WebSocket hooks
│   └── use-local-storage.ts # Storage hooks
├── services/                 # Business logic services
│   ├── api-client.ts        # HTTP client configuration
│   ├── websocket-manager.ts # WebSocket management
│   └── auth-service.ts      # Authentication service
├── stores/                   # Global state management
│   ├── app-store.ts         # Main Zustand store
│   ├── auth-store.ts        # Authentication store
│   └── ui-store.ts          # UI state store
├── types/                    # TypeScript type definitions
│   ├── api.ts               # API response types
│   ├── models.ts            # Data model types
│   └── ui.ts                # UI component types
├── utils/                    # Utility functions
│   ├── format.ts            # Data formatting
│   ├── validation.ts        # Input validation
│   └── constants.ts         # Application constants
└── app/                      # Next.js App Router
    ├── (auth)/              # Authenticated routes
    │   ├── dashboard/       # Dashboard pages
    │   ├── workspace/       # Workspace pages
    │   ├── assistant/       # AI Assistant pages
    │   └── portfolio/       # Portfolio pages
    ├── api/                 # API route handlers
    ├── globals.css          # Global styles
    ├── layout.tsx           # Root layout
    └── page.tsx             # Home page
```

### Module Architecture Pattern

Each feature module follows a consistent internal structure:

```typescript
// Module structure example: modules/workspace/
export interface WorkspaceModule {
  // Components
  components: {
    FileExplorer: React.ComponentType;
    CodeEditor: React.ComponentType;
    Terminal: React.ComponentType;
    ProjectManager: React.ComponentType;
  };

  // Hooks
  hooks: {
    useFileSystem: () => FileSystemHook;
    useTerminal: () => TerminalHook;
    useProject: () => ProjectHook;
  };

  // Services
  services: {
    fileService: FileService;
    terminalService: TerminalService;
    projectService: ProjectService;
  };

  // Store slice
  store: WorkspaceSlice;

  // Types
  types: WorkspaceTypes;
}

// Module registration pattern
const moduleRegistry = new Map<string, ModuleDefinition>();
moduleRegistry.set("workspace", WorkspaceModule);
moduleRegistry.set("ai-assistant", AIAssistantModule);
moduleRegistry.set("portfolio", PortfolioModule);
```

---

## Performance Optimization Strategy

### Code Splitting & Lazy Loading

```typescript
// Route-based code splitting
const DashboardPage = lazy(
  () => import("./modules/dashboard/pages/DashboardPage"),
);
const WorkspacePage = lazy(
  () => import("./modules/workspace/pages/WorkspacePage"),
);
const AssistantPage = lazy(
  () => import("./modules/ai-assistant/pages/AssistantPage"),
);
const PortfolioPage = lazy(
  () => import("./modules/portfolio/pages/PortfolioPage"),
);

// Component-based lazy loading for heavy components
const MonacoEditor = lazy(() => import("@monaco-editor/react"));
const TradingChart = lazy(() => import("./components/charts/TradingChart"));

// Bundle splitting configuration
const bundleConfig = {
  chunks: {
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name: "vendors",
      chunks: "all",
    },
    common: {
      name: "common",
      minChunks: 2,
      chunks: "all",
    },
  },
};
```

### Memory Management

```typescript
// Custom hook for WebSocket cleanup
const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    setSocket(ws);

    return () => {
      ws.close();
      setSocket(null);
    };
  }, [url]);

  return socket;
};

// Memory-efficient component pattern
const ExpensiveComponent = memo(({ data }: { data: LargeData }) => {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return processLargeData(data);
  }, [data]);

  return <div>{processedData}</div>;
});
```

### Caching Strategy

```typescript
// React Query configuration for optimal caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Retry logic based on error type
        if (error.status === 404) return false;
        return failureCount < 3;
      },
    },
  },
});

// Service Worker for offline caching
const cacheConfig = {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
};
```

### Image & Asset Optimization

```typescript
// Next.js Image optimization
import Image from 'next/image';

const OptimizedImage = ({ src, alt, ...props }) => (
  <Image
    src={src}
    alt={alt}
    quality={75}
    placeholder="blur"
    blurDataURL="/blur-placeholder.jpg"
    {...props}
  />
);

// SVG optimization for icons
const IconComponent = ({ name, size = 24 }) => {
  const IconSVG = useMemo(() =>
    lazy(() => import(`@/assets/icons/${name}.svg`))
  , [name]);

  return <IconSVG width={size} height={size} />;
};
```

---

## Security Architecture

### Authentication & Authorization

```typescript
// JWT token management with automatic refresh
class AuthService {
  private refreshTokenTimer?: NodeJS.Timeout;

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post("/auth/login", credentials);

    this.setTokens(response.data.accessToken, response.data.refreshToken);
    this.scheduleTokenRefresh(response.data.expiresIn);

    return response.data;
  }

  private scheduleTokenRefresh(expiresIn: number) {
    const refreshTime = (expiresIn - 120) * 1000; // Refresh 2 minutes before expiry

    this.refreshTokenTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshTime);
  }

  private async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      const response = await api.post("/auth/refresh", { refreshToken });

      this.setTokens(response.data.accessToken, response.data.refreshToken);
      this.scheduleTokenRefresh(response.data.expiresIn);
    } catch (error) {
      this.logout();
    }
  }
}
```

### Input Sanitization & Validation

```typescript
// Zod schemas for runtime validation
const userSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  firstName: z.string().min(1).max(50).regex(/^[a-zA-Z\s]+$/),
  lastName: z.string().min(1).max(50).regex(/^[a-zA-Z\s]+$/),
});

// DOMPurify for HTML sanitization
import DOMPurify from 'dompurify';

const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });
};

// XSS prevention in components
const SafeHTML = ({ content }: { content: string }) => {
  const sanitizedContent = useMemo(() =>
    sanitizeHtml(content), [content]
  );

  return (
    <div
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      className="safe-content"
    />
  );
};
```

### CSRF Protection

```typescript
// CSRF token management
class CSRFService {
  private csrfToken: string | null = null;

  async getCSRFToken(): Promise<string> {
    if (!this.csrfToken) {
      const response = await api.get("/csrf-token");
      this.csrfToken = response.data.token;
    }
    return this.csrfToken;
  }

  async setupCSRFProtection() {
    const token = await this.getCSRFToken();

    // Add CSRF token to all requests
    api.interceptors.request.use((config) => {
      if (
        ["post", "put", "patch", "delete"].includes(
          config.method?.toLowerCase() || "",
        )
      ) {
        config.headers["X-CSRF-Token"] = token;
      }
      return config;
    });
  }
}
```

### Content Security Policy

```typescript
// CSP configuration
const cspDirectives = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "img-src": ["'self'", "data:", "https:"],
  "connect-src": ["'self'", "ws:", "wss:", "https://api.claude.ai"],
  "font-src": ["'self'", "https://fonts.gstatic.com"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};

// Next.js security headers
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
];
```

---

## Scalability Architecture

### Component Scalability Pattern

```typescript
// Micro-frontend inspired module pattern
interface ModuleDefinition {
  name: string;
  routes: RouteDefinition[];
  components: ComponentRegistry;
  services: ServiceRegistry;
  store: StoreSlice;
}

class ModuleLoader {
  private modules = new Map<string, ModuleDefinition>();

  async loadModule(name: string): Promise<ModuleDefinition> {
    if (!this.modules.has(name)) {
      const module = await import(`./modules/${name}`);
      this.modules.set(name, module.default);
    }
    return this.modules.get(name)!;
  }

  registerModule(module: ModuleDefinition) {
    this.modules.set(module.name, module);
    this.setupModuleRoutes(module);
    this.registerModuleComponents(module);
  }
}

// Dynamic component registry
class ComponentRegistry {
  private components = new Map<string, React.ComponentType>();

  register<T extends React.ComponentType>(name: string, component: T): void {
    this.components.set(name, component);
  }

  get<T extends React.ComponentType>(name: string): T | null {
    return (this.components.get(name) as T) || null;
  }

  lazy<T extends React.ComponentType>(
    name: string,
    loader: () => Promise<{ default: T }>,
  ): React.ComponentType {
    return lazy(() =>
      loader().then((module) => {
        this.register(name, module.default);
        return module;
      }),
    );
  }
}
```

### State Management Scalability

```typescript
// Modular Zustand store with dynamic slices
interface AppState {
  [key: string]: any;
}

class StoreManager {
  private store: UseBoundStore<StoreApi<AppState>>;
  private slices = new Map<string, any>();

  constructor() {
    this.store = create<AppState>(() => ({}));
  }

  registerSlice<T>(name: string, slice: StateCreator<T>) {
    if (this.slices.has(name)) return;

    this.slices.set(name, slice);

    // Dynamically add slice to existing store
    this.store.setState((state) => ({
      ...state,
      [name]: slice(
        (partial) => this.store.setState(partial),
        () => this.store.getState(),
        this.store,
      ),
    }));
  }

  getSlice<T>(name: string): T {
    return this.store.getState()[name];
  }
}

// Auto-cleanup for unused modules
class ModuleCleanup {
  private moduleUsage = new Map<string, number>();
  private cleanupTimer?: NodeJS.Timeout;

  trackModuleUsage(moduleName: string) {
    this.moduleUsage.set(moduleName, Date.now());
    this.scheduleCleanup();
  }

  private scheduleCleanup() {
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);

    this.cleanupTimer = setTimeout(() => {
      const now = Date.now();
      const CLEANUP_THRESHOLD = 5 * 60 * 1000; // 5 minutes

      for (const [module, lastUsed] of this.moduleUsage) {
        if (now - lastUsed > CLEANUP_THRESHOLD) {
          this.unloadModule(module);
        }
      }
    }, 60 * 1000); // Check every minute
  }
}
```

### API Client Scalability

```typescript
// Intelligent request batching and caching
class ScalableApiClient {
  private requestQueue = new Map<string, Promise<any>>();
  private batchQueue: BatchRequest[] = [];
  private batchTimer?: NodeJS.Timeout;

  // Deduplication of identical requests
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const key = this.generateRequestKey(config);

    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key);
    }

    const promise = this.executeRequest<T>(config);
    this.requestQueue.set(key, promise);

    // Clean up completed requests
    promise.finally(() => {
      this.requestQueue.delete(key);
    });

    return promise;
  }

  // Batch multiple requests
  batch<T>(requests: AxiosRequestConfig[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ requests, resolve, reject });
      this.scheduleBatchExecution();
    });
  }

  private scheduleBatchExecution() {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.executeBatch();
      this.batchTimer = undefined;
    }, 10); // Batch requests within 10ms window
  }
}
```

---

## Real-time Architecture

### WebSocket Connection Management

```typescript
// Connection pool for multiple WebSocket services
class WebSocketConnectionPool {
  private connections = new Map<string, WebSocketConnection>();
  private reconnectionStrategies = new Map<string, ReconnectionStrategy>();

  connect(
    service: string,
    endpoint: string,
    options: ConnectionOptions = {},
  ): WebSocketConnection {
    const connectionId = `${service}-${endpoint}`;

    if (this.connections.has(connectionId)) {
      return this.connections.get(connectionId)!;
    }

    const connection = new WebSocketConnection(endpoint, {
      ...options,
      onClose: () => this.handleDisconnection(connectionId),
      onError: (error) => this.handleError(connectionId, error),
    });

    this.connections.set(connectionId, connection);
    this.setupReconnectionStrategy(connectionId, options.reconnect);

    return connection;
  }

  private setupReconnectionStrategy(
    connectionId: string,
    strategy: ReconnectionStrategy = "exponential",
  ) {
    const strategies = {
      exponential: new ExponentialBackoffStrategy(),
      linear: new LinearBackoffStrategy(),
      immediate: new ImmediateReconnectStrategy(),
    };

    this.reconnectionStrategies.set(connectionId, strategies[strategy]);
  }
}

// Message routing and handling
class WebSocketMessageRouter {
  private handlers = new Map<string, MessageHandler[]>();
  private middleware: MessageMiddleware[] = [];

  on(event: string, handler: MessageHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: string, data: any): void {
    const message = { event, data, timestamp: Date.now() };

    // Apply middleware
    const processedMessage = this.middleware.reduce(
      (msg, middleware) => middleware(msg),
      message,
    );

    // Route to handlers
    const handlers = this.handlers.get(event) || [];
    handlers.forEach((handler) => handler(processedMessage));
  }

  use(middleware: MessageMiddleware): void {
    this.middleware.push(middleware);
  }
}
```

### Real-time State Synchronization

```typescript
// State synchronization across multiple clients
class RealTimeStateSync {
  private wsManager: WebSocketManager;
  private stateManager: StateManager;
  private conflictResolver: ConflictResolver;

  constructor(wsManager: WebSocketManager, stateManager: StateManager) {
    this.wsManager = wsManager;
    this.stateManager = stateManager;
    this.conflictResolver = new ConflictResolver();
  }

  sync<T>(key: string, initialState: T): SyncedState<T> {
    const syncedState = new SyncedState(key, initialState);

    // Listen for remote updates
    this.wsManager.on(`state-update-${key}`, (update) => {
      this.handleRemoteUpdate(key, update);
    });

    // Send local updates
    syncedState.onChange((newState, oldState) => {
      const patch = this.createStatePatch(oldState, newState);
      this.wsManager.send(`state-update-${key}`, patch);
    });

    return syncedState;
  }

  private handleRemoteUpdate(key: string, update: StateUpdate) {
    const currentState = this.stateManager.getState(key);

    if (this.hasConflict(currentState, update)) {
      const resolvedState = this.conflictResolver.resolve(
        currentState,
        update.state,
        update.patches,
      );
      this.stateManager.setState(key, resolvedState);
    } else {
      this.stateManager.applyPatch(key, update.patches);
    }
  }
}

// Optimistic updates with rollback capability
class OptimisticStateManager {
  private pendingUpdates = new Map<string, PendingUpdate>();
  private rollbackStack = new Map<string, StateSnapshot[]>();

  async optimisticUpdate<T>(
    key: string,
    updateFn: (state: T) => T,
    apiCall: () => Promise<T>,
  ): Promise<T> {
    const currentState = this.getState<T>(key);
    const optimisticState = updateFn(currentState);
    const updateId = generateId();

    // Apply optimistic update
    this.setState(key, optimisticState);
    this.addToRollbackStack(key, currentState);

    // Track pending update
    this.pendingUpdates.set(updateId, {
      key,
      optimisticState,
      originalState: currentState,
    });

    try {
      const serverState = await apiCall();
      this.confirmUpdate(updateId, serverState);
      return serverState;
    } catch (error) {
      this.rollbackUpdate(updateId);
      throw error;
    }
  }

  private rollbackUpdate(updateId: string): void {
    const pendingUpdate = this.pendingUpdates.get(updateId);
    if (!pendingUpdate) return;

    this.setState(pendingUpdate.key, pendingUpdate.originalState);
    this.pendingUpdates.delete(updateId);
  }
}
```

---

## Mobile Integration Strategy

### Progressive Web App (PWA) Implementation

```typescript
// Service Worker configuration
const serviceWorkerConfig = {
  // Cache strategies
  runtimeCaching: [
    // App Shell
    {
      urlPattern: /^https:\/\/myapp\.com\/$/,
      handler: "CacheFirst",
      options: {
        cacheName: "app-shell",
      },
    },

    // API responses
    {
      urlPattern: /^https:\/\/api\.myapp\.com\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },

    // Static assets
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],

  // Background sync
  backgroundSync: {
    syncTasks: [
      {
        name: "portfolio-updates",
        pattern: /\/api\/portfolios\//,
      },
      {
        name: "chat-messages",
        pattern: /\/api\/chat\/messages/,
      },
    ],
  },
};

// Offline functionality
class OfflineManager {
  private syncQueue: OfflineAction[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    this.setupOnlineListeners();
    this.setupBackgroundSync();
  }

  async queueAction(action: OfflineAction): Promise<void> {
    this.syncQueue.push(action);

    if (this.isOnline) {
      await this.syncPendingActions();
    } else {
      this.storeInIndexedDB(action);
    }
  }

  private async syncPendingActions(): Promise<void> {
    const failedActions: OfflineAction[] = [];

    for (const action of this.syncQueue) {
      try {
        await this.executeAction(action);
      } catch (error) {
        failedActions.push(action);
      }
    }

    this.syncQueue = failedActions;
  }
}
```

### Flutter Mobile App Integration

```typescript
// Flutter-Web communication bridge
interface FlutterWebBridge {
  // Data synchronization
  syncPortfolioData(): Promise<void>;
  syncChatHistory(): Promise<void>;
  syncUserPreferences(): Promise<void>;

  // Real-time updates
  subscribeToPriceUpdates(symbols: string[]): void;
  subscribeToNotifications(): void;

  // Device features
  requestNotificationPermission(): Promise<boolean>;
  scheduleNotification(notification: NotificationData): void;
  requestBiometricAuth(): Promise<boolean>;
}

class FlutterBridge implements FlutterWebBridge {
  private messageChannel: MessageChannel;

  constructor() {
    this.setupMessageChannel();
  }

  private setupMessageChannel(): void {
    // Setup bidirectional communication with Flutter app
    if (window.flutter_inappwebview) {
      this.messageChannel = new MessageChannel();

      window.flutter_inappwebview.callHandler("setupWebBridge", {
        port: this.messageChannel.port1,
      });
    }
  }

  async syncPortfolioData(): Promise<void> {
    const portfolioData = await this.getPortfolioData();

    this.sendToFlutter("sync_portfolio", {
      portfolios: portfolioData.portfolios,
      positions: portfolioData.positions,
      performance: portfolioData.performance,
    });
  }

  private sendToFlutter(action: string, data: any): void {
    this.messageChannel.port1.postMessage({
      action,
      data,
      timestamp: Date.now(),
    });
  }
}

// Push notification handling
class PushNotificationManager {
  private vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY;

  async subscribe(): Promise<PushSubscription | null> {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.vapidPublicKey,
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      return subscription;
    }

    return null;
  }

  async sendPortfolioAlert(
    userId: string,
    alert: PortfolioAlert,
  ): Promise<void> {
    await fetch("/api/notifications/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        notification: {
          title: alert.title,
          body: alert.message,
          icon: "/icons/portfolio-alert.png",
          badge: "/icons/badge.png",
          data: { type: "portfolio_alert", alertId: alert.id },
        },
      }),
    });
  }
}
```

---

## Error Handling & Logging Architecture

### Global Error Handling

```typescript
// Error boundary for React components
class GlobalErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service
    ErrorLogger.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      userId: this.props.userId,
      route: window.location.pathname,
    });

    // Report to error tracking service
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

// Centralized error logger
class ErrorLogger {
  private static instance: ErrorLogger;
  private logQueue: LogEntry[] = [];
  private isOnline = navigator.onLine;

  static logError(
    error: Error,
    context: ErrorContext = {}
  ): void {
    if (!this.instance) {
      this.instance = new ErrorLogger();
    }

    this.instance.log({
      type: 'error',
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      context,
    });
  }

  private async log(entry: LogEntry): Promise<void> {
    this.logQueue.push(entry);

    if (this.isOnline && this.logQueue.length > 0) {
      await this.flushLogs();
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: this.logQueue }),
      });

      this.logQueue = [];
    } catch (error) {
      console.error('Failed to flush logs:', error);
    }
  }
}
```

### API Error Handling

```typescript
// Standardized API error handling
interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  requestId: string;
}

class ApiErrorHandler {
  private retryStrategies = new Map<number, RetryStrategy>();

  constructor() {
    this.setupRetryStrategies();
  }

  private setupRetryStrategies(): void {
    this.retryStrategies.set(429, new ExponentialBackoffRetry()); // Rate limit
    this.retryStrategies.set(502, new LinearRetry()); // Bad gateway
    this.retryStrategies.set(503, new LinearRetry()); // Service unavailable
    this.retryStrategies.set(504, new LinearRetry()); // Gateway timeout
  }

  async handleError(
    error: AxiosError,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    const status = error.response?.status;

    if (status && this.retryStrategies.has(status)) {
      const strategy = this.retryStrategies.get(status)!;
      return strategy.retry(config);
    }

    // Handle specific error types
    switch (status) {
      case 401:
        return this.handleUnauthorized(error, config);
      case 403:
        return this.handleForbidden(error);
      case 422:
        return this.handleValidationError(error);
      default:
        return this.handleGenericError(error);
    }
  }

  private async handleUnauthorized(
    error: AxiosError,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    // Attempt token refresh
    try {
      await AuthService.refreshToken();
      return axios.request(config);
    } catch (refreshError) {
      // Redirect to login
      AuthService.logout();
      window.location.href = "/login";
      throw error;
    }
  }
}

// User-friendly error messages
class ErrorMessageService {
  private errorMessages = new Map<string, string>();

  constructor() {
    this.setupErrorMessages();
  }

  private setupErrorMessages(): void {
    this.errorMessages.set(
      "NETWORK_ERROR",
      "Please check your internet connection and try again.",
    );
    this.errorMessages.set(
      "VALIDATION_ERROR",
      "Please check your input and try again.",
    );
    this.errorMessages.set("UNAUTHORIZED", "Please log in to continue.");
    this.errorMessages.set(
      "FORBIDDEN",
      "You don't have permission to perform this action.",
    );
    this.errorMessages.set(
      "NOT_FOUND",
      "The requested resource was not found.",
    );
    this.errorMessages.set(
      "RATE_LIMITED",
      "Too many requests. Please wait and try again.",
    );
  }

  getUserMessage(error: ApiError): string {
    return (
      this.errorMessages.get(error.code) ||
      "An unexpected error occurred. Please try again."
    );
  }

  showErrorToast(error: ApiError): void {
    const message = this.getUserMessage(error);

    toast.error(message, {
      id: error.requestId, // Prevent duplicate toasts
      duration: 5000,
      action: {
        label: "Dismiss",
        onClick: () => toast.dismiss(error.requestId),
      },
    });
  }
}
```

---

This comprehensive Frontend Architecture document provides the technical foundation for building a scalable, secure, and performant frontend application that integrates seamlessly with the microservices backend. The architecture is designed to support the business requirements while maintaining flexibility for future enhancements and optimizations.
