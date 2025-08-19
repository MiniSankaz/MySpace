# Performance & Security Architecture

## Stock Portfolio Management System v3.0

### Document Information

- **Version**: 1.0
- **Date**: 2025-08-15
- **Project**: Stock Portfolio Management System v3.0
- **Document Type**: Performance & Security Architecture Specification
- **Status**: Final
- **Dependencies**: Frontend Architecture, API Integration, Implementation Roadmap

---

## Architecture Overview

The Performance & Security Architecture defines comprehensive strategies for delivering a fast, secure, and scalable frontend application capable of supporting 10,000+ concurrent users while maintaining strict security standards and optimal user experience.

### Core Principles

- **Performance First**: Sub-2-second load times and responsive interactions
- **Security by Design**: Multi-layered security with defense in depth
- **Scalability Focus**: Horizontal scaling and efficient resource utilization
- **User Experience**: Consistent performance across all devices and network conditions
- **Compliance Ready**: GDPR, SOX, and financial data protection standards

---

## Performance Optimization Architecture

### Bundle Optimization Strategy

#### Code Splitting & Lazy Loading

```typescript
/**
 * Strategic Code Splitting Implementation
 */

// Route-based splitting with preloading
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);

const WorkspacePage = lazy(() =>
  import("./pages/WorkspacePage").then((module) => ({
    default: module.WorkspacePage,
  })),
);

const PortfolioPage = lazy(() =>
  import("./pages/PortfolioPage").then((module) => ({
    default: module.PortfolioPage,
  })),
);

// Component-based lazy loading for heavy features
const MonacoEditor = lazy(() =>
  import("@monaco-editor/react").then((module) => ({
    default: module.Editor,
  })),
);

const TradingChart = lazy(() => import("./components/charts/TradingChart"));

// Preloading strategy
class PreloadManager {
  private preloadQueue: string[] = [];
  private preloadedModules = new Set<string>();

  preloadRoute(routePath: string): void {
    if (this.preloadedModules.has(routePath)) return;

    const moduleMap = {
      "/dashboard": () => import("./pages/DashboardPage"),
      "/workspace": () => import("./pages/WorkspacePage"),
      "/portfolio": () => import("./pages/PortfolioPage"),
      "/assistant": () => import("./pages/AssistantPage"),
    };

    const loader = moduleMap[routePath];
    if (loader) {
      loader().then(() => {
        this.preloadedModules.add(routePath);
      });
    }
  }

  preloadOnIdle(): void {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        this.preloadQueue.forEach((route) => this.preloadRoute(route));
      });
    }
  }
}

// Bundle analysis configuration
const bundleConfig = {
  splitChunks: {
    chunks: "all",
    cacheGroups: {
      // Vendor libraries
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: "vendors",
        chunks: "all",
        maxSize: 250000, // 250KB max vendor chunks
      },

      // Common components
      common: {
        name: "common",
        minChunks: 2,
        chunks: "all",
        enforce: true,
        maxSize: 200000, // 200KB max common chunks
      },

      // Chart libraries (heavy)
      charts: {
        test: /[\\/]node_modules[\\/](chart\.js|d3|plotly\.js)/,
        name: "charts",
        chunks: "all",
        priority: 20,
      },

      // Monaco Editor (very heavy)
      monaco: {
        test: /[\\/]node_modules[\\/](@monaco-editor|monaco-editor)/,
        name: "monaco",
        chunks: "all",
        priority: 30,
      },
    },
  },
};
```

#### Image & Asset Optimization

```typescript
/**
 * Advanced Asset Optimization
 */

// Next.js Image optimization with responsive loading
const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
}> = ({ src, alt, width, height, priority = false }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={75}
        placeholder="blur"
        blurDataURL="/images/blur-placeholder.jpg"
        onLoadingComplete={() => setIsLoading(false)}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
      />
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
    </div>
  );
};

// SVG optimization and sprite system
class SvgSpriteManager {
  private sprites = new Map<string, string>();
  private loaded = new Set<string>();

  async loadSprite(spriteName: string): Promise<void> {
    if (this.loaded.has(spriteName)) return;

    const response = await fetch(`/sprites/${spriteName}.svg`);
    const svgContent = await response.text();

    // Inject sprite into DOM
    const spriteContainer = document.getElementById('svg-sprites') ||
      this.createSpriteContainer();

    spriteContainer.innerHTML += svgContent;
    this.loaded.add(spriteName);
  }

  private createSpriteContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'svg-sprites';
    container.style.display = 'none';
    document.body.appendChild(container);
    return container;
  }
}

// WebP and AVIF format detection and fallback
const ImageFormatDetector = {
  supportsWebP: null as boolean | null,
  supportsAVIF: null as boolean | null,

  async detectFormats(): Promise<void> {
    if (this.supportsWebP === null) {
      this.supportsWebP = await this.canUseFormat('webp');
    }

    if (this.supportsAVIF === null) {
      this.supportsAVIF = await this.canUseFormat('avif');
    }
  },

  async canUseFormat(format: 'webp' | 'avif'): Promise<boolean> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img.width > 0 && img.height > 0);
      img.onerror = () => resolve(false);

      const testData = {
        webp: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
        avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQ=='
      };

      img.src = testData[format];
    });
  },

  getOptimalImageUrl(baseUrl: string): string {
    const url = new URL(baseUrl, window.location.origin);

    if (this.supportsAVIF) {
      url.searchParams.set('format', 'avif');
    } else if (this.supportsWebP) {
      url.searchParams.set('format', 'webp');
    }

    return url.toString();
  }
};
```

### Memory Management & Resource Optimization

#### Intelligent State Management

```typescript
/**
 * Memory-Efficient State Management
 */

// Automatic state cleanup for inactive modules
class StateCleanupManager {
  private cleanupTimers = new Map<string, NodeJS.Timeout>();
  private stateSnapshots = new Map<string, any>();

  scheduleCleanup(moduleId: string, cleanupDelay = 5 * 60 * 1000): void {
    // Clear existing timer
    const existingTimer = this.cleanupTimers.get(moduleId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new cleanup
    const timer = setTimeout(() => {
      this.cleanupModuleState(moduleId);
    }, cleanupDelay);

    this.cleanupTimers.set(moduleId, timer);
  }

  private cleanupModuleState(moduleId: string): void {
    const store = useAppStore.getState();

    // Create snapshot before cleanup
    this.stateSnapshots.set(moduleId, store[moduleId]);

    // Clear module state
    useAppStore.setState((state) => ({
      ...state,
      [moduleId]: getInitialModuleState(moduleId),
    }));

    console.log(`✅ Cleaned up state for module: ${moduleId}`);
  }

  restoreModuleState(moduleId: string): void {
    const snapshot = this.stateSnapshots.get(moduleId);
    if (snapshot) {
      useAppStore.setState((state) => ({
        ...state,
        [moduleId]: snapshot,
      }));

      this.stateSnapshots.delete(moduleId);
    }
  }
}

// Memory-efficient data structures for large datasets
class VirtualizedDataManager<T> {
  private data: T[] = [];
  private visibleRange = { start: 0, end: 0 };
  private itemHeight = 50;
  private containerHeight = 400;

  setData(newData: T[]): void {
    this.data = newData;
    this.updateVisibleRange(0);
  }

  updateVisibleRange(scrollTop: number): void {
    const start = Math.floor(scrollTop / this.itemHeight);
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const end = Math.min(start + visibleCount + 5, this.data.length); // 5 item buffer

    this.visibleRange = { start, end };
  }

  getVisibleItems(): T[] {
    return this.data.slice(this.visibleRange.start, this.visibleRange.end);
  }

  getTotalHeight(): number {
    return this.data.length * this.itemHeight;
  }

  getOffsetY(): number {
    return this.visibleRange.start * this.itemHeight;
  }
}

// Component memory optimization
const useComponentCleanup = (dependencies: any[]) => {
  const cleanupFunctions = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((cleanupFn: () => void) => {
    cleanupFunctions.current.push(cleanupFn);
  }, []);

  useEffect(() => {
    return () => {
      // Execute all cleanup functions
      cleanupFunctions.current.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      });
      cleanupFunctions.current = [];
    };
  }, dependencies);

  return addCleanup;
};
```

#### WebSocket Connection Optimization

```typescript
/**
 * Scalable WebSocket Management
 */

class OptimizedWebSocketManager {
  private connectionPool = new Map<string, PooledConnection>();
  private messageQueue = new Map<string, QueuedMessage[]>();
  private reconnectStrategies = new Map<string, ReconnectionStrategy>();

  // Connection pooling for efficient resource usage
  async getConnection(
    serviceId: string,
    config: WSConfig,
  ): Promise<PooledConnection> {
    let connection = this.connectionPool.get(serviceId);

    if (!connection || connection.readyState !== WebSocket.OPEN) {
      connection = await this.createPooledConnection(serviceId, config);
      this.connectionPool.set(serviceId, connection);
    }

    return connection;
  }

  private async createPooledConnection(
    serviceId: string,
    config: WSConfig,
  ): Promise<PooledConnection> {
    const ws = new WebSocket(config.url);
    const connection: PooledConnection = {
      socket: ws,
      serviceId,
      subscribers: new Set(),
      messageBuffer: [],
      lastActivity: Date.now(),
      readyState: ws.readyState,
    };

    // Connection management
    ws.onopen = () => {
      connection.readyState = ws.readyState;
      this.flushMessageQueue(serviceId);
      this.scheduleHeartbeat(connection);
    };

    ws.onmessage = (event) => {
      connection.lastActivity = Date.now();
      this.distributeMessage(connection, event.data);
    };

    ws.onclose = () => {
      this.handleConnectionClose(serviceId, connection);
    };

    return connection;
  }

  // Intelligent message batching
  send(serviceId: string, message: WSMessage): void {
    const connection = this.connectionPool.get(serviceId);

    if (connection?.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message));
    } else {
      this.queueMessage(serviceId, message);
    }
  }

  private queueMessage(serviceId: string, message: WSMessage): void {
    if (!this.messageQueue.has(serviceId)) {
      this.messageQueue.set(serviceId, []);
    }

    const queue = this.messageQueue.get(serviceId)!;
    queue.push({ message, timestamp: Date.now() });

    // Prevent queue overflow
    if (queue.length > 100) {
      queue.splice(0, queue.length - 100);
    }
  }

  private flushMessageQueue(serviceId: string): void {
    const queue = this.messageQueue.get(serviceId);
    if (!queue) return;

    const connection = this.connectionPool.get(serviceId);
    if (connection?.readyState === WebSocket.OPEN) {
      queue.forEach(({ message }) => {
        connection.socket.send(JSON.stringify(message));
      });

      this.messageQueue.delete(serviceId);
    }
  }

  // Automatic connection cleanup for idle connections
  private scheduleConnectionCleanup(): void {
    setInterval(
      () => {
        const now = Date.now();
        const maxIdleTime = 10 * 60 * 1000; // 10 minutes

        for (const [serviceId, connection] of this.connectionPool) {
          if (
            now - connection.lastActivity > maxIdleTime &&
            connection.subscribers.size === 0
          ) {
            connection.socket.close();
            this.connectionPool.delete(serviceId);
            console.log(`🧹 Cleaned up idle connection: ${serviceId}`);
          }
        }
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes
  }
}

interface PooledConnection {
  socket: WebSocket;
  serviceId: string;
  subscribers: Set<string>;
  messageBuffer: any[];
  lastActivity: number;
  readyState: number;
}

interface QueuedMessage {
  message: WSMessage;
  timestamp: number;
}
```

### Caching Strategy & Data Management

#### Multi-Level Caching Architecture

```typescript
/**
 * Comprehensive Caching System
 */

// Browser cache management
class BrowserCacheManager {
  private cacheAPI: Cache | null = null;
  private memoryCache = new Map<string, CacheEntry>();
  private maxMemorySize = 50 * 1024 * 1024; // 50MB
  private currentMemorySize = 0;

  async initialize(): Promise<void> {
    if ("caches" in window) {
      this.cacheAPI = await caches.open("portfolio-app-v1");
    }
  }

  // Multi-tier caching strategy
  async get<T>(key: string): Promise<T | null> {
    // 1. Memory cache (fastest)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // 2. Cache API (fast)
    if (this.cacheAPI) {
      const response = await this.cacheAPI.match(key);
      if (response) {
        const data = await response.json();

        // Populate memory cache
        this.setMemoryCache(key, data, Date.now() + 5 * 60 * 1000); // 5 min TTL
        return data as T;
      }
    }

    // 3. IndexedDB (persistent)
    return this.getFromIndexedDB<T>(key);
  }

  async set<T>(
    key: string,
    data: T,
    ttl: number = 30 * 60 * 1000,
  ): Promise<void> {
    const expiresAt = Date.now() + ttl;

    // Memory cache
    this.setMemoryCache(key, data, expiresAt);

    // Cache API
    if (this.cacheAPI) {
      const response = new Response(JSON.stringify({ data, expiresAt }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `max-age=${Math.floor(ttl / 1000)}`,
        },
      });

      await this.cacheAPI.put(key, response);
    }

    // IndexedDB for persistent storage
    await this.setInIndexedDB(key, { data, expiresAt });
  }

  private setMemoryCache<T>(key: string, data: T, expiresAt: number): void {
    const entry: CacheEntry = {
      data,
      expiresAt,
      size: this.estimateSize(data),
    };

    // Memory management
    this.ensureMemoryLimit(entry.size);

    this.memoryCache.set(key, entry);
    this.currentMemorySize += entry.size;
  }

  private ensureMemoryLimit(newEntrySize: number): void {
    while (
      this.currentMemorySize + newEntrySize > this.maxMemorySize &&
      this.memoryCache.size > 0
    ) {
      // LRU eviction (simplified)
      const oldestKey = this.memoryCache.keys().next().value;
      const oldEntry = this.memoryCache.get(oldestKey);

      this.memoryCache.delete(oldestKey);
      this.currentMemorySize -= oldEntry?.size || 0;
    }
  }

  private estimateSize(data: any): number {
    // Rough size estimation for memory management
    return JSON.stringify(data).length * 2; // 2 bytes per character (UTF-16)
  }
}

// React Query optimization for server state
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes

      // Intelligent retry logic
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }

        // Retry up to 3 times for network errors
        return failureCount < 3;
      },

      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Background refetching strategy
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },

    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Intelligent prefetching
class PrefetchManager {
  private prefetchQueue = new Set<string>();
  private prefetchedData = new Map<string, any>();
  private maxPrefetchSize = 20;

  schedulePrefetch(queryKey: string, queryFn: () => Promise<any>): void {
    if (this.prefetchQueue.size >= this.maxPrefetchSize) return;
    if (this.prefetchedData.has(queryKey)) return;

    this.prefetchQueue.add(queryKey);

    // Prefetch on idle
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        this.executePrefetch(queryKey, queryFn);
      });
    } else {
      setTimeout(() => {
        this.executePrefetch(queryKey, queryFn);
      }, 0);
    }
  }

  private async executePrefetch(
    queryKey: string,
    queryFn: () => Promise<any>,
  ): Promise<void> {
    try {
      const data = await queryFn();
      this.prefetchedData.set(queryKey, data);

      // Cache in React Query
      queryClient.setQueryData(queryKey, data);
    } catch (error) {
      console.warn(`Prefetch failed for ${queryKey}:`, error);
    } finally {
      this.prefetchQueue.delete(queryKey);
    }
  }
}

interface CacheEntry {
  data: any;
  expiresAt: number;
  size: number;
}
```

---

## Security Architecture

### Authentication & Authorization

#### Advanced JWT Management

```typescript
/**
 * Secure Token Management System
 */

class SecureTokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenRefreshPromise: Promise<string> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  // Secure token storage with encryption
  setTokens(accessToken: string, refreshToken: string): void {
    const encryptedAccess = this.encryptToken(accessToken);
    const encryptedRefresh = this.encryptToken(refreshToken);

    // Use secure storage
    if (this.isSecureStorageAvailable()) {
      sessionStorage.setItem("at", encryptedAccess);
      localStorage.setItem("rt", encryptedRefresh);
    } else {
      // Fallback to memory-only storage
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    }

    this.scheduleTokenRefresh(accessToken);
  }

  getAccessToken(): string | null {
    if (this.accessToken) return this.accessToken;

    const encrypted = sessionStorage.getItem("at");
    if (encrypted) {
      return this.decryptToken(encrypted);
    }

    return null;
  }

  // Automatic token refresh with race condition prevention
  async refreshAccessToken(): Promise<string> {
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.tokenRefreshPromise;
      return newToken;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error("Token refresh failed");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await response.json();
    this.setTokens(accessToken, newRefreshToken);

    return accessToken;
  }

  private scheduleTokenRefresh(token: string): void {
    const payload = this.parseJWT(token);
    if (!payload) return;

    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const refreshTime = expiresAt - 2 * 60 * 1000; // Refresh 2 minutes before expiry
    const delay = refreshTime - Date.now();

    if (delay > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken().catch((error) => {
          console.error("Automatic token refresh failed:", error);
          this.handleAuthFailure();
        });
      }, delay);
    }
  }

  private encryptToken(token: string): string {
    // Simple encryption for demonstration - use proper encryption in production
    const key = this.getEncryptionKey();
    return btoa(token + key);
  }

  private decryptToken(encryptedToken: string): string {
    const key = this.getEncryptionKey();
    const decoded = atob(encryptedToken);
    return decoded.replace(key, "");
  }

  private getEncryptionKey(): string {
    // Generate key based on browser fingerprint
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx?.fillText("fingerprint", 10, 10);
    return canvas.toDataURL().slice(-10);
  }

  private parseJWT(token: string): any {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }
}

// Role-based access control
class RoleBasedAccessControl {
  private userPermissions: Set<string> = new Set();
  private roleHierarchy: Map<string, string[]> = new Map([
    ["admin", ["user", "premium", "admin"]],
    ["premium", ["user", "premium"]],
    ["user", ["user"]],
    ["guest", []],
  ]);

  setUserRole(role: string, permissions: string[]): void {
    this.userPermissions.clear();

    // Add role-based permissions
    const inheritedRoles = this.roleHierarchy.get(role) || [];
    inheritedRoles.forEach((r) => {
      this.addRolePermissions(r);
    });

    // Add explicit permissions
    permissions.forEach((permission) => {
      this.userPermissions.add(permission);
    });
  }

  hasPermission(permission: string): boolean {
    return this.userPermissions.has(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((permission) => this.hasPermission(permission));
  }

  // React hook for permission-based rendering
  usePermission(permission: string): boolean {
    return useMemo(() => this.hasPermission(permission), [permission]);
  }
}
```

### Input Validation & Sanitization

#### Comprehensive Input Security

```typescript
/**
 * Advanced Input Validation & Sanitization
 */

// Zod schemas with security-first validation
const secureValidationSchemas = {
  email: z
    .string()
    .email("Invalid email format")
    .max(254, "Email too long")
    .regex(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid email format",
    )
    .transform((email) => email.toLowerCase().trim()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/(?=.*[a-z])/, "Password must contain lowercase letter")
    .regex(/(?=.*[A-Z])/, "Password must contain uppercase letter")
    .regex(/(?=.*\d)/, "Password must contain number")
    .regex(/(?=.*[@$!%*?&])/, "Password must contain special character")
    .regex(/^[a-zA-Z0-9@$!%*?&]*$/, "Password contains invalid characters"),

  stockSymbol: z
    .string()
    .min(1, "Stock symbol required")
    .max(10, "Stock symbol too long")
    .regex(/^[A-Z0-9.-]+$/, "Invalid stock symbol format")
    .transform((symbol) => symbol.toUpperCase()),

  fileName: z
    .string()
    .min(1, "File name required")
    .max(255, "File name too long")
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid file name characters")
    .refine((name) => !name.startsWith("."), "File name cannot start with dot")
    .refine(
      (name) => !/\.(exe|bat|cmd|com|scr)$/i.test(name),
      "File type not allowed",
    ),

  portfolioName: z
    .string()
    .min(1, "Portfolio name required")
    .max(100, "Portfolio name too long")
    .regex(/^[a-zA-Z0-9\s._-]+$/, "Invalid portfolio name characters")
    .transform((name) => name.trim()),

  numericAmount: z
    .number()
    .positive("Amount must be positive")
    .max(Number.MAX_SAFE_INTEGER, "Amount too large")
    .multipleOf(0.01, "Amount must have at most 2 decimal places"),
};

// HTML sanitization with DOMPurify
class HtmlSanitizer {
  private purify: any;

  constructor() {
    // Lazy load DOMPurify
    import("dompurify").then((DOMPurify) => {
      this.purify = DOMPurify.default || DOMPurify;
      this.configurePurify();
    });
  }

  private configurePurify(): void {
    // Configure allowed tags and attributes
    this.purify.addHook("beforeSanitizeElements", (node: Element) => {
      // Remove script tags completely
      if (node.tagName === "SCRIPT") {
        node.remove();
      }
    });

    this.purify.addHook("afterSanitizeAttributes", (node: Element) => {
      // Remove javascript: URLs
      ["href", "src", "action"].forEach((attr) => {
        const value = node.getAttribute(attr);
        if (value && /^javascript:/i.test(value)) {
          node.removeAttribute(attr);
        }
      });
    });
  }

  sanitize(html: string): string {
    if (!this.purify) return ""; // Not loaded yet

    return this.purify.sanitize(html, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "i",
        "b",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "code",
        "pre",
        "a",
        "img",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "id"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp):\/\/|mailto:|tel:|#)/i,
      KEEP_CONTENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      SANITIZE_DOM: true,
    });
  }

  sanitizeForAttribute(value: string): string {
    return (
      this.purify?.sanitize(value, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
      }) || ""
    );
  }
}

// SQL Injection prevention (for any dynamic queries)
class SqlSanitizer {
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+SELECT)/gi,
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
    /(--|\/\*|\*\/)/g,
    /(;\s*(SELECT|INSERT|UPDATE|DELETE))/gi,
  ];

  static containsSqlInjection(input: string): boolean {
    return this.SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
  }

  static sanitize(input: string): string {
    if (this.containsSqlInjection(input)) {
      throw new Error("Potential SQL injection detected");
    }

    // Additional sanitization
    return input
      .replace(/[<>'"]/g, "") // Remove dangerous characters
      .trim();
  }
}

// File upload security
class FileUploadSecurity {
  private static readonly ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  private static readonly ALLOWED_DOCUMENT_TYPES = [
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",
    "text/markdown",
  ];

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB

  static validateFile(file: File): { valid: boolean; error?: string } {
    // Size validation
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: "File size exceeds 10MB limit" };
    }

    // Type validation
    const allowedTypes = [
      ...this.ALLOWED_IMAGE_TYPES,
      ...this.ALLOWED_DOCUMENT_TYPES,
    ];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: "File type not allowed" };
    }

    // Name validation
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      return { valid: false, error: "Invalid file name characters" };
    }

    // Extension validation
    const extension = file.name.toLowerCase().split(".").pop();
    const dangerousExtensions = [
      "exe",
      "bat",
      "cmd",
      "com",
      "scr",
      "vbs",
      "js",
    ];
    if (extension && dangerousExtensions.includes(extension)) {
      return { valid: false, error: "File extension not allowed" };
    }

    return { valid: true };
  }

  static async validateFileContent(
    file: File,
  ): Promise<{ valid: boolean; error?: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const content = event.target?.result as string;

        // Check for script tags in uploaded content
        if (/<script/i.test(content)) {
          resolve({
            valid: false,
            error: "File contains potentially dangerous content",
          });
          return;
        }

        // Check for data URLs that might contain malicious content
        if (/data:[^;]+;base64,/i.test(content)) {
          resolve({ valid: false, error: "File contains embedded data URLs" });
          return;
        }

        resolve({ valid: true });
      };

      reader.onerror = () => {
        resolve({ valid: false, error: "Failed to read file content" });
      };

      reader.readAsText(file);
    });
  }
}
```

### Content Security Policy & XSS Prevention

#### Advanced CSP Implementation

```typescript
/**
 * Content Security Policy Configuration
 */

const contentSecurityPolicy = {
  // Strict CSP for production
  production: {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'", // Required for Next.js
      "https://cdn.jsdelivr.net",
      "https://unpkg.com",
      "https://www.google-analytics.com",
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS
      "https://fonts.googleapis.com",
    ],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https:",
      "https://www.google-analytics.com",
    ],
    "connect-src": [
      "'self'",
      "ws:",
      "wss:",
      "https://api.claude.ai",
      "https://api.polygon.io",
      "https://api.finnhub.io",
    ],
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "object-src": ["'none'"],
    "media-src": ["'self'"],
    "frame-src": ["'none'"],
    "child-src": ["'none'"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
    "block-all-mixed-content": [],
  },

  // Relaxed CSP for development
  development: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "connect-src": ["'self'", "ws:", "wss:", "https:"],
    "font-src": ["'self'", "https:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  },
};

// XSS Prevention utilities
class XSSPrevention {
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi,
  ];

  static containsXSS(input: string): boolean {
    return this.XSS_PATTERNS.some((pattern) => pattern.test(input));
  }

  static sanitizeInput(input: string): string {
    if (this.containsXSS(input)) {
      console.warn("Potential XSS attempt detected and blocked");
      return "";
    }

    return input.replace(/[<>]/g, (match) => {
      const charMap: { [key: string]: string } = {
        "<": "&lt;",
        ">": "&gt;",
      };
      return charMap[match];
    });
  }

  static escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  static unescapeHtml(html: string): string {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || "";
  }
}

// CSRF Protection
class CSRFProtection {
  private csrfToken: string | null = null;
  private tokenExpiry: number | null = null;

  async getCSRFToken(): Promise<string> {
    if (this.csrfToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.csrfToken;
    }

    const response = await fetch("/api/v1/auth/csrf-token");
    const data = await response.json();

    this.csrfToken = data.token;
    this.tokenExpiry = Date.now() + data.expiresIn * 1000;

    return this.csrfToken;
  }

  async setupCSRFProtection(): Promise<void> {
    const token = await this.getCSRFToken();

    // Add to all forms
    document.querySelectorAll("form").forEach((form) => {
      let csrfInput = form.querySelector(
        'input[name="csrf-token"]',
      ) as HTMLInputElement;
      if (!csrfInput) {
        csrfInput = document.createElement("input");
        csrfInput.type = "hidden";
        csrfInput.name = "csrf-token";
        form.appendChild(csrfInput);
      }
      csrfInput.value = token;
    });

    // Add to axios defaults
    axios.defaults.headers.common["X-CSRF-Token"] = token;
  }
}
```

### Monitoring & Logging

#### Security Event Monitoring

```typescript
/**
 * Security Event Monitoring System
 */

interface SecurityEvent {
  type: "auth" | "xss" | "csrf" | "injection" | "file_upload" | "rate_limit";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  userId?: string;
  userAgent: string;
  ip: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class SecurityMonitor {
  private eventQueue: SecurityEvent[] = [];
  private rateLimiters = new Map<string, RateLimiter>();

  logSecurityEvent(
    event: Omit<SecurityEvent, "timestamp" | "userAgent" | "ip">,
  ): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      ip: this.getClientIP(),
    };

    this.eventQueue.push(securityEvent);

    // Immediate action for critical events
    if (event.severity === "critical") {
      this.handleCriticalEvent(securityEvent);
    }

    // Flush events periodically
    if (this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await fetch("/api/v1/security/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      console.error("Failed to send security events:", error);
      // Add events back to queue for retry
      this.eventQueue.unshift(...events);
    }
  }

  private handleCriticalEvent(event: SecurityEvent): void {
    // Immediate notifications for critical events
    if (event.type === "injection" || event.type === "xss") {
      // Block user temporarily
      this.blockUser(event.userId);

      // Show security warning
      this.showSecurityWarning();
    }
  }

  // Rate limiting per user/IP
  checkRateLimit(key: string, limit: number, window: number): boolean {
    let rateLimiter = this.rateLimiters.get(key);

    if (!rateLimiter) {
      rateLimiter = new RateLimiter(limit, window);
      this.rateLimiters.set(key, rateLimiter);
    }

    const allowed = rateLimiter.checkLimit();

    if (!allowed) {
      this.logSecurityEvent({
        type: "rate_limit",
        severity: "medium",
        description: `Rate limit exceeded for ${key}`,
        metadata: { key, limit, window },
      });
    }

    return allowed;
  }

  private blockUser(userId?: string): void {
    if (!userId) return;

    // Temporary client-side blocking
    sessionStorage.setItem("security_block", "true");

    // Logout user
    window.location.href = "/login?blocked=true";
  }

  private showSecurityWarning(): void {
    const warning = document.createElement("div");
    warning.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; background: #dc2626; color: white; padding: 16px; text-align: center; z-index: 9999;">
        <strong>Security Warning:</strong> Suspicious activity detected. Please contact support if this was unexpected.
      </div>
    `;
    document.body.appendChild(warning);

    setTimeout(() => {
      document.body.removeChild(warning);
    }, 10000);
  }

  private getClientIP(): string {
    // This would typically come from server-side headers
    return "client-ip-unknown";
  }
}

class RateLimiter {
  private requests: number[] = [];

  constructor(
    private limit: number,
    private windowMs: number,
  ) {}

  checkLimit(): boolean {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    // Check if under limit
    if (this.requests.length < this.limit) {
      this.requests.push(now);
      return true;
    }

    return false;
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor();

// React hook for security monitoring
export const useSecurityMonitoring = () => {
  useEffect(() => {
    // Monitor console for potential XSS attempts
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(" ");
      if (XSSPrevention.containsXSS(message)) {
        securityMonitor.logSecurityEvent({
          type: "xss",
          severity: "high",
          description: "XSS attempt detected in console",
          metadata: { message: message.substring(0, 200) },
        });
      }
      originalLog.apply(console, args);
    };

    // Monitor DOM modifications
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === "SCRIPT") {
                securityMonitor.logSecurityEvent({
                  type: "xss",
                  severity: "critical",
                  description: "Script tag injected into DOM",
                  metadata: { innerHTML: element.innerHTML.substring(0, 200) },
                });
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      console.log = originalLog;
      observer.disconnect();
    };
  }, []);
};
```

---

This comprehensive Performance & Security Architecture provides the foundation for building a fast, secure, and scalable frontend application that meets enterprise-grade standards while delivering exceptional user experience.
