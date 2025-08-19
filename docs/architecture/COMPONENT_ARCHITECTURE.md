# Component Architecture Document

## Stock Portfolio Management System v3.0

### Document Information

- **Version**: 1.0
- **Date**: 2025-08-15
- **Project**: Stock Portfolio Management System v3.0
- **Document Type**: Component Architecture Specification
- **Status**: Final
- **Dependencies**: Frontend Architecture Document, Business Requirements Document

---

## Component Architecture Overview

The component architecture follows a hierarchical pattern with clear separation of concerns, promoting reusability, testability, and maintainability. The architecture is designed to support the four main modules: Web Core, Workspace, AI Assistant, and Portfolio Management.

### Component Hierarchy Diagram (ASCII)

```
Application Root
├── Layout Components (Global)
│   ├── AppLayout
│   ├── NavigationSidebar
│   ├── TopHeader
│   └── FooterNavigation (Mobile)
├── Page Components (Routes)
│   ├── DashboardPage
│   ├── WorkspacePage
│   ├── AssistantPage
│   └── PortfolioPage
├── Feature Components (Modules)
│   ├── WebCoreComponents/
│   ├── WorkspaceComponents/
│   ├── AIAssistantComponents/
│   └── PortfolioComponents/
├── Shared UI Components
│   ├── BasicComponents/
│   ├── FormComponents/
│   ├── ChartComponents/
│   └── FeedbackComponents/
└── Utility Components
    ├── ErrorBoundary
    ├── LoadingSpinner
    ├── ConditionalRender
    └── ProtectedRoute
```

---

## Component Standards & Conventions

### Naming Conventions

#### Component Files

```typescript
// PascalCase for component files
LoginForm.tsx;
DashboardWidget.tsx;
PortfolioChart.tsx;
UserProfileModal.tsx;

// Include component type in name when helpful
LoginForm.tsx; // Form component
DashboardLayout.tsx; // Layout component
PriceChart.tsx; // Chart component
LoadingSpinner.tsx; // UI component
```

#### Props Interfaces

```typescript
// Component name + Props suffix
interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void;
  loading?: boolean;
  error?: string;
}

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  onRefresh?: () => void;
}

interface PortfolioChartProps {
  data: ChartData[];
  timeframe: TimeFrame;
  height?: number;
  interactive?: boolean;
}
```

### Component Structure Pattern

```typescript
// Standard component structure template
interface ComponentNameProps {
  // Required props (no default values)
  requiredProp: string;
  onAction: (data: ActionData) => void;

  // Optional props (with defaults or undefined)
  optionalProp?: string;
  className?: string;
  disabled?: boolean;

  // Children and render props
  children?: React.ReactNode;
  renderCustomElement?: (data: any) => React.ReactNode;
}

const ComponentName: React.FC<ComponentNameProps> = ({
  requiredProp,
  onAction,
  optionalProp,
  className,
  disabled = false,
  children,
  renderCustomElement,
}) => {
  // 1. Hooks (in order of complexity)
  const [localState, setLocalState] = useState<StateType>(initialState);
  const [loading, setLoading] = useState(false);

  // 2. Custom hooks
  const { user } = useAuth();
  const { mutate } = useMutation();

  // 3. Memoized values
  const processedData = useMemo(() => {
    return processData(requiredProp);
  }, [requiredProp]);

  // 4. Callbacks
  const handleAction = useCallback((data: ActionData) => {
    setLoading(true);
    try {
      onAction(data);
    } finally {
      setLoading(false);
    }
  }, [onAction]);

  // 5. Effects
  useEffect(() => {
    // Effect logic
  }, [/* dependencies */]);

  // 6. Early returns
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <UnauthorizedMessage />;
  }

  // 7. Render
  return (
    <div className={cn("component-base-styles", className)}>
      {/* Component content */}
      {children}
      {renderCustomElement?.(processedData)}
    </div>
  );
};

// 8. Display name and exports
ComponentName.displayName = 'ComponentName';

export default ComponentName;
export type { ComponentNameProps };
```

### Props Interface Patterns

#### Standard Props Pattern

```typescript
// Base props that many components share
interface BaseComponentProps {
  className?: string;
  id?: string;
  testId?: string;
  disabled?: boolean;
  loading?: boolean;
}

// Event handler props pattern
interface ComponentEventProps {
  onClick?: (event: React.MouseEvent) => void;
  onChange?: (value: any) => void;
  onSubmit?: (data: any) => void;
  onError?: (error: Error) => void;
  onSuccess?: (result: any) => void;
}

// Data props pattern
interface ComponentDataProps<T = any> {
  data: T;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

// Render props pattern
interface ComponentRenderProps<T = any> {
  children?: React.ReactNode;
  renderItem?: (item: T, index: number) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderError?: (error: string) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
}
```

### Component Composition Patterns

#### Compound Components Pattern

```typescript
// Main component with sub-components
const Dashboard = ({ children, className }: DashboardProps) => (
  <div className={cn("dashboard-container", className)}>
    {children}
  </div>
);

const DashboardHeader = ({ title, actions }: DashboardHeaderProps) => (
  <header className="dashboard-header">
    <h1>{title}</h1>
    <div className="dashboard-actions">{actions}</div>
  </header>
);

const DashboardContent = ({ children }: DashboardContentProps) => (
  <main className="dashboard-content">
    {children}
  </main>
);

const DashboardSidebar = ({ children }: DashboardSidebarProps) => (
  <aside className="dashboard-sidebar">
    {children}
  </aside>
);

// Compound component structure
Dashboard.Header = DashboardHeader;
Dashboard.Content = DashboardContent;
Dashboard.Sidebar = DashboardSidebar;

// Usage
const MyDashboard = () => (
  <Dashboard>
    <Dashboard.Header title="Portfolio Overview" actions={<RefreshButton />} />
    <Dashboard.Sidebar>
      <NavigationMenu />
    </Dashboard.Sidebar>
    <Dashboard.Content>
      <PortfolioWidgets />
    </Dashboard.Content>
  </Dashboard>
);
```

#### Provider Pattern for Context

```typescript
// Context provider component
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: ThemeContextValue['theme']) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [theme, setTheme] = useState<ThemeContextValue['theme']>('system');

  const isDark = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    isDark,
  }), [theme, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      <div className={isDark ? 'dark' : 'light'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

// Hook for consuming context
const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

### Error Boundary Patterns

```typescript
// Generic error boundary with fallback UI
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error;
  onRetry: () => void;
}

class ComponentErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry
}) => (
  <div className="error-fallback">
    <h2>Something went wrong</h2>
    <p>{error.message}</p>
    <button onClick={onRetry}>Try again</button>
  </div>
);
```

### Loading & Error States

```typescript
// Loading states pattern
interface LoadingStatesProps<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  children: (data: T) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: string) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
}

const LoadingStates = <T,>({
  data,
  loading,
  error,
  children,
  renderLoading,
  renderError,
  renderEmpty,
}: LoadingStatesProps<T>) => {
  if (loading) {
    return renderLoading?.() || <LoadingSpinner />;
  }

  if (error) {
    return renderError?.(error) || <ErrorMessage error={error} />;
  }

  if (!data) {
    return renderEmpty?.() || <EmptyState />;
  }

  return children(data);
};

// Usage
const UserList = () => {
  const { data: users, loading, error } = useUsers();

  return (
    <LoadingStates
      data={users}
      loading={loading}
      error={error}
      renderLoading={() => <UserListSkeleton />}
      renderError={(error) => <UserListError error={error} />}
      renderEmpty={() => <NoUsersMessage />}
    >
      {(users) => (
        <div className="user-list">
          {users.map(user => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      )}
    </LoadingStates>
  );
};
```

---

## Module-Specific Component Libraries

### 1. Web Core Components

#### Authentication Components

```typescript
// LoginForm.tsx - Main login component
interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  loading?: boolean;
  error?: string;
  showSocialLogin?: boolean;
  redirectTo?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  loading = false,
  error,
  showSocialLogin = true,
  redirectTo,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="login-form">
      <div className="form-group">
        <Input
          {...register('email')}
          type="email"
          placeholder="Email address"
          error={errors.email?.message}
        />
      </div>

      <div className="form-group">
        <PasswordInput
          {...register('password')}
          placeholder="Password"
          error={errors.password?.message}
        />
      </div>

      <div className="form-actions">
        <Button
          type="submit"
          disabled={!isValid || loading}
          loading={loading}
          className="w-full"
        >
          Sign In
        </Button>
      </div>

      {showSocialLogin && <SocialLoginButtons />}

      {error && <ErrorMessage error={error} />}
    </form>
  );
};

// SocialLoginButtons.tsx - OAuth login options
interface SocialLoginButtonsProps {
  providers?: SocialProvider[];
  onProviderSelect?: (provider: SocialProvider) => void;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  providers = ['google', 'github', 'apple'],
  onProviderSelect,
}) => {
  const handleProviderLogin = (provider: SocialProvider) => {
    onProviderSelect?.(provider);
    // Redirect to OAuth provider
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  return (
    <div className="social-login-buttons">
      <div className="divider">
        <span>Or continue with</span>
      </div>

      <div className="provider-buttons">
        {providers.map(provider => (
          <SocialLoginButton
            key={provider}
            provider={provider}
            onClick={() => handleProviderLogin(provider)}
          />
        ))}
      </div>
    </div>
  );
};
```

#### Dashboard Components

```typescript
// DashboardWidget.tsx - Base widget component
interface DashboardWidgetProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onRefresh?: () => void;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  subtitle,
  children,
  actions,
  loading = false,
  error,
  className,
  size = 'md',
  onRefresh,
}) => {
  const sizeClasses = {
    sm: 'col-span-1 row-span-1',
    md: 'col-span-2 row-span-2',
    lg: 'col-span-3 row-span-2',
    xl: 'col-span-4 row-span-3',
  };

  return (
    <Card className={cn(
      'dashboard-widget',
      sizeClasses[size],
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </div>

        <div className="flex items-center space-x-2">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshIcon className={cn(
                "h-4 w-4",
                loading && "animate-spin"
              )} />
            </Button>
          )}
          {actions}
        </div>
      </CardHeader>

      <CardContent>
        <LoadingStates
          data={!error ? true : null}
          loading={loading}
          error={error}
          renderLoading={() => <WidgetSkeleton />}
          renderError={(error) => <WidgetError error={error} />}
        >
          {() => children}
        </LoadingStates>
      </CardContent>
    </Card>
  );
};

// DashboardGrid.tsx - Responsive grid layout
interface DashboardGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
}

const DashboardGrid: React.FC<DashboardGridProps> = ({
  children,
  columns = 4,
  gap = 4,
  className,
}) => {
  return (
    <div
      className={cn(
        'dashboard-grid',
        'grid auto-rows-min',
        `grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns}`,
        `gap-${gap}`,
        className
      )}
    >
      {children}
    </div>
  );
};
```

#### Navigation Components

```typescript
// NavigationSidebar.tsx - Main navigation component
interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  children?: NavigationItem[];
  permissions?: string[];
  badge?: {
    text: string;
    variant: 'default' | 'warning' | 'error';
  };
}

interface NavigationSidebarProps {
  items: NavigationItem[];
  currentPath: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  items,
  currentPath,
  collapsed = false,
  onToggle,
}) => {
  const { user } = useAuth();

  const hasPermission = (permissions?: string[]) => {
    if (!permissions) return true;
    return permissions.some(permission =>
      user?.permissions?.includes(permission)
    );
  };

  const filteredItems = useMemo(() =>
    items.filter(item => hasPermission(item.permissions)),
    [items, user?.permissions]
  );

  return (
    <nav className={cn(
      'navigation-sidebar',
      'fixed left-0 top-0 h-full bg-card border-r',
      'transition-all duration-300 ease-in-out',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className="p-4">
        <NavigationHeader collapsed={collapsed} onToggle={onToggle} />
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1">
          {filteredItems.map(item => (
            <NavigationItem
              key={item.id}
              item={item}
              currentPath={currentPath}
              collapsed={collapsed}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <UserMenu collapsed={collapsed} />
      </div>
    </nav>
  );
};

// NavigationItem.tsx - Individual navigation item
interface NavigationItemProps {
  item: NavigationItem;
  currentPath: string;
  collapsed: boolean;
  level?: number;
}

const NavigationItem: React.FC<NavigationItemProps> = ({
  item,
  currentPath,
  collapsed,
  level = 0,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isActive = currentPath === item.href;
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start',
              level > 0 && 'ml-4',
              collapsed && 'justify-center'
            )}
            onClick={() => {
              if (hasChildren) {
                setExpanded(!expanded);
              } else {
                // Navigate to route
              }
            }}
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && (
              <>
                <span className="ml-2">{item.label}</span>
                {item.badge && (
                  <Badge variant={item.badge.variant} className="ml-auto">
                    {item.badge.text}
                  </Badge>
                )}
                {hasChildren && (
                  <ChevronDownIcon
                    className={cn(
                      "ml-auto h-4 w-4 transition-transform",
                      expanded && "rotate-180"
                    )}
                  />
                )}
              </>
            )}
          </Button>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right">
            {item.label}
          </TooltipContent>
        )}
      </Tooltip>

      {hasChildren && expanded && !collapsed && (
        <div className="mt-1 space-y-1">
          {item.children.map(child => (
            <NavigationItem
              key={child.id}
              item={child}
              currentPath={currentPath}
              collapsed={false}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

### 2. Workspace Components

#### File Explorer Components

```typescript
// FileExplorer.tsx - Main file explorer component
interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  modifiedAt: Date;
  children?: FileNode[];
  gitStatus?: GitFileStatus;
}

interface FileExplorerProps {
  projectId: string;
  files: FileNode[];
  selectedFile?: string;
  onFileSelect: (file: FileNode) => void;
  onFileCreate: (path: string, type: 'file' | 'directory') => void;
  onFileRename: (oldPath: string, newPath: string) => void;
  onFileDelete: (path: string) => void;
  loading?: boolean;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  projectId,
  files,
  selectedFile,
  onFileSelect,
  onFileCreate,
  onFileRename,
  onFileDelete,
  loading = false,
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: FileNode;
  } | null>(null);

  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileNode) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file,
    });
  };

  return (
    <div className="file-explorer h-full flex flex-col">
      <div className="file-explorer-header p-2 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Explorer</h3>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFileCreate('', 'file')}
            >
              <FileIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFileCreate('', 'directory')}
            >
              <FolderIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <FileTreeSkeleton />
        ) : (
          <div className="p-1">
            {files.map(file => (
              <FileTreeItem
                key={file.path}
                file={file}
                level={0}
                expanded={expandedDirs.has(file.path)}
                selected={selectedFile === file.path}
                onToggle={() => toggleDirectory(file.path)}
                onSelect={() => onFileSelect(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={() => setContextMenu(null)}
          onRename={(oldPath, newPath) => {
            onFileRename(oldPath, newPath);
            setContextMenu(null);
          }}
          onDelete={(path) => {
            onFileDelete(path);
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
};

// FileTreeItem.tsx - Individual file/directory item
interface FileTreeItemProps {
  file: FileNode;
  level: number;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  file,
  level,
  expanded,
  selected,
  onToggle,
  onSelect,
  onContextMenu,
}) => {
  const isDirectory = file.type === 'directory';
  const hasChildren = file.children && file.children.length > 0;

  const getFileIcon = () => {
    if (isDirectory) {
      return expanded ? FolderOpenIcon : FolderIcon;
    }

    // Return specific icon based on file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'ts':
      case 'tsx':
        return TypeScriptIcon;
      case 'js':
      case 'jsx':
        return JavaScriptIcon;
      case 'css':
        return CSSIcon;
      case 'html':
        return HTMLIcon;
      case 'json':
        return JSONIcon;
      default:
        return FileIcon;
    }
  };

  const Icon = getFileIcon();

  return (
    <div>
      <div
        className={cn(
          'file-tree-item flex items-center py-1 px-2 text-sm cursor-pointer rounded hover:bg-accent',
          selected && 'bg-accent',
          'ml-' + (level * 4)
        )}
        onClick={isDirectory ? onToggle : onSelect}
        onContextMenu={onContextMenu}
      >
        <div className="flex items-center space-x-2 flex-1">
          {isDirectory && (
            <ChevronRightIcon
              className={cn(
                'h-3 w-3 transition-transform',
                expanded && 'rotate-90'
              )}
            />
          )}

          <Icon className="h-4 w-4 flex-shrink-0" />

          <span className="truncate">{file.name}</span>

          {file.gitStatus && (
            <GitStatusIndicator status={file.gitStatus} />
          )}
        </div>

        {file.type === 'file' && file.size && (
          <span className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </span>
        )}
      </div>

      {isDirectory && expanded && hasChildren && (
        <div>
          {file.children!.map(child => (
            <FileTreeItem
              key={child.path}
              file={child}
              level={level + 1}
              expanded={expanded}
              selected={selected}
              onToggle={onToggle}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

#### Code Editor Components

```typescript
// CodeEditor.tsx - Monaco editor wrapper
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  theme?: 'light' | 'dark';
  height?: number;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  onSave?: () => void;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  theme = 'dark',
  height = 400,
  options = {},
  onSave,
  onMount,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

  const defaultOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    minimap: { enabled: true },
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    detectIndentation: true,
    formatOnPaste: true,
    formatOnType: true,
    ...options,
  };

  const handleMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      editor.getAction('actions.find')?.run();
    });

    // Setup IntelliSense
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    onMount?.(editor);
  };

  return (
    <div className="code-editor border rounded-md overflow-hidden">
      <MonacoEditor
        height={height}
        language={language}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        value={value}
        onChange={(value) => onChange(value || '')}
        options={defaultOptions}
        onMount={handleMount}
      />
    </div>
  );
};

// EditorTabs.tsx - Multi-file tab management
interface EditorTab {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  modified: boolean;
}

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabSave: (tabId: string) => void;
}

const EditorTabs: React.FC<EditorTabsProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabSave,
}) => {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (draggedTab && draggedTab !== targetTabId) {
      // Handle tab reordering
      onTabReorder(draggedTab, targetTabId);
    }
    setDraggedTab(null);
  };

  return (
    <div className="editor-tabs border-b bg-background">
      <ScrollArea orientation="horizontal">
        <div className="flex">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={cn(
                'editor-tab flex items-center px-3 py-2 border-r cursor-pointer select-none',
                'hover:bg-accent/50 transition-colors',
                activeTabId === tab.id && 'bg-accent border-b-2 border-primary'
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tab.id)}
              onClick={() => onTabSelect(tab.id)}
            >
              <div className="flex items-center space-x-2">
                <FileIcon className="h-4 w-4" />
                <span className="text-sm">{tab.name}</span>
                {tab.modified && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
```

#### Terminal Components

```typescript
// Terminal.tsx - Terminal interface component
interface TerminalProps {
  sessionId: string;
  projectId: string;
  type: 'system' | 'claude';
  title?: string;
  onCommand?: (command: string) => void;
  onOutput?: (output: string) => void;
}

const Terminal: React.FC<TerminalProps> = ({
  sessionId,
  projectId,
  type,
  title,
  onCommand,
  onOutput,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<XTerm | null>(null);
  const { isConnected, sendCommand, output } = useTerminalWebSocket(sessionId);

  useEffect(() => {
    if (terminalRef.current) {
      const xterm = new XTerm({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          selection: '#264f78',
        },
        scrollback: 1000,
        rightClickSelectsWord: true,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      xterm.loadAddon(fitAddon);
      xterm.loadAddon(webLinksAddon);

      xterm.open(terminalRef.current);
      fitAddon.fit();

      // Handle user input
      xterm.onData((data) => {
        sendCommand(data);
        onCommand?.(data);
      });

      // Handle window resize
      const handleResize = () => {
        fitAddon.fit();
      };

      window.addEventListener('resize', handleResize);

      setTerminal(xterm);

      return () => {
        window.removeEventListener('resize', handleResize);
        xterm.dispose();
      };
    }
  }, [sessionId, sendCommand, onCommand]);

  // Handle incoming output
  useEffect(() => {
    if (terminal && output) {
      terminal.write(output);
      onOutput?.(output);
    }
  }, [terminal, output, onOutput]);

  return (
    <div className="terminal-container h-full flex flex-col">
      <div className="terminal-header flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-sm font-medium">
            {title || `Terminal ${type}`}
          </span>
          <ConnectionStatus connected={isConnected} />
        </div>

        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm">
            <SettingsIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MaximizeIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={terminalRef}
        className="terminal-content flex-1 p-2"
      />
    </div>
  );
};

// TerminalLayout.tsx - Multi-terminal layout manager
interface TerminalLayoutProps {
  sessions: TerminalSession[];
  layout: 'single' | 'horizontal' | 'vertical' | 'grid';
  activeSessionId?: string;
  onSessionCreate: () => void;
  onSessionClose: (sessionId: string) => void;
  onSessionSelect: (sessionId: string) => void;
  onLayoutChange: (layout: TerminalLayoutProps['layout']) => void;
}

const TerminalLayout: React.FC<TerminalLayoutProps> = ({
  sessions,
  layout,
  activeSessionId,
  onSessionCreate,
  onSessionClose,
  onSessionSelect,
  onLayoutChange,
}) => {
  const renderTerminalGrid = () => {
    const gridClasses = {
      single: 'grid-cols-1 grid-rows-1',
      horizontal: 'grid-cols-2 grid-rows-1',
      vertical: 'grid-cols-1 grid-rows-2',
      grid: 'grid-cols-2 grid-rows-2',
    };

    return (
      <div className={cn(
        'terminal-grid grid gap-1 h-full',
        gridClasses[layout]
      )}>
        {sessions.slice(0, getMaxSessions()).map(session => (
          <div
            key={session.id}
            className={cn(
              'terminal-pane border rounded',
              activeSessionId === session.id && 'border-primary'
            )}
            onClick={() => onSessionSelect(session.id)}
          >
            <Terminal
              sessionId={session.id}
              projectId={session.projectId}
              type={session.type}
              title={session.name}
            />
          </div>
        ))}
      </div>
    );
  };

  const getMaxSessions = () => {
    switch (layout) {
      case 'single': return 1;
      case 'horizontal': return 2;
      case 'vertical': return 2;
      case 'grid': return 4;
      default: return 1;
    }
  };

  return (
    <div className="terminal-layout h-full flex flex-col">
      <div className="terminal-toolbar flex items-center justify-between p-2 border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSessionCreate}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            New Terminal
          </Button>

          <TerminalSessionTabs
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSessionSelect={onSessionSelect}
            onSessionClose={onSessionClose}
          />
        </div>

        <TerminalLayoutSelector
          layout={layout}
          onLayoutChange={onLayoutChange}
        />
      </div>

      <div className="terminal-content flex-1 p-2">
        {renderTerminalGrid()}
      </div>
    </div>
  );
};
```

### 3. AI Assistant Components

#### Chat Interface Components

```typescript
// ChatInterface.tsx - Main chat component
interface ChatInterfaceProps {
  conversationId: string;
  messages: Message[];
  loading: boolean;
  onSendMessage: (content: string, attachments?: File[]) => void;
  onMessageEdit: (messageId: string, content: string) => void;
  onMessageDelete: (messageId: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  messages,
  loading,
  onSendMessage,
  onMessageEdit,
  onMessageDelete,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim() || attachments.length > 0) {
      onSendMessage(inputValue.trim(), attachments);
      setInputValue('');
      setAttachments([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-interface flex flex-col h-full">
      <div className="chat-header p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">AI Assistant</h2>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <SettingsIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVerticalIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(message => (
            <ChatMessage
              key={message.id}
              message={message}
              onEdit={(content) => onMessageEdit(message.id, content)}
              onDelete={() => onMessageDelete(message.id)}
            />
          ))}

          {loading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="chat-input border-t">
        <ChatInputArea
          value={inputValue}
          onChange={setInputValue}
          onKeyPress={handleKeyPress}
          onSend={handleSend}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          disabled={loading}
        />
      </div>
    </div>
  );
};

// ChatMessage.tsx - Individual message component
interface ChatMessageProps {
  message: Message;
  onEdit: (content: string) => void;
  onDelete: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const handleEdit = () => {
    onEdit(editContent);
    setIsEditing(false);
  };

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn(
        'chat-message flex gap-3',
        isUser && 'flex-row-reverse'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className={cn(
        'w-8 h-8 flex-shrink-0',
        isUser && 'bg-primary'
      )}>
        {isUser ? (
          <UserIcon className="w-4 h-4" />
        ) : (
          <BotIcon className="w-4 h-4" />
        )}
      </Avatar>

      <div className={cn(
        'message-content max-w-[70%] rounded-lg px-3 py-2 relative',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[60px] resize-none"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleEdit}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="prose prose-sm dark:prose-invert">
              <ReactMarkdown
                components={{
                  code: CodeBlock,
                  pre: PreBlock,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map(attachment => (
                  <MessageAttachment
                    key={attachment.id}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {showActions && !isEditing && (
          <div className={cn(
            'absolute -top-2 flex space-x-1 bg-background border rounded shadow-sm',
            isUser ? '-left-2' : '-right-2'
          )}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <EditIcon className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
            >
              <TrashIcon className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm">
              <CopyIcon className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-1">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

// ChatInputArea.tsx - Message input component
interface ChatInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
  disabled?: boolean;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  value,
  onChange,
  onKeyPress,
  onSend,
  attachments,
  onAttachmentsChange,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onAttachmentsChange([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="chat-input-area p-4 space-y-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center space-x-1 bg-muted rounded px-2 py-1 text-sm"
            >
              <FileIcon className="w-3 h-3" />
              <span>{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="w-4 h-4 p-0"
                onClick={() => removeAttachment(index)}
              >
                <XIcon className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Type your message..."
            className="min-h-[60px] resize-none pr-20"
            disabled={disabled}
          />

          <div className="absolute bottom-2 right-2 flex space-x-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperclipIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={onSend}
          disabled={disabled || (!value.trim() && attachments.length === 0)}
          className="px-6"
        >
          <SendIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
```

### 4. Portfolio Components

#### Portfolio Dashboard Components

```typescript
// PortfolioDashboard.tsx - Main portfolio overview
interface PortfolioDashboardProps {
  portfolios: Portfolio[];
  selectedPortfolioId?: string;
  onPortfolioSelect: (portfolioId: string) => void;
  onPortfolioCreate: () => void;
}

const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  portfolios,
  selectedPortfolioId,
  onPortfolioSelect,
  onPortfolioCreate,
}) => {
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const { data: marketData } = useRealTimeMarketData();

  return (
    <div className="portfolio-dashboard space-y-6">
      <div className="dashboard-header flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your investments and trading performance
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <PortfolioSelector
            portfolios={portfolios}
            selectedId={selectedPortfolioId}
            onSelect={onPortfolioSelect}
          />
          <Button onClick={onPortfolioCreate}>
            <PlusIcon className="w-4 h-4 mr-1" />
            New Portfolio
          </Button>
        </div>
      </div>

      {selectedPortfolio ? (
        <div className="dashboard-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <PortfolioSummaryCard portfolio={selectedPortfolio} />
            <PerformanceCard portfolio={selectedPortfolio} />
            <AllocationCard portfolio={selectedPortfolio} />
            <AlertsCard portfolio={selectedPortfolio} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <PerformanceChart portfolio={selectedPortfolio} />
              <HoldingsTable portfolio={selectedPortfolio} />
            </div>

            <div className="space-y-6">
              <MarketOverview data={marketData} />
              <RecentTransactions portfolio={selectedPortfolio} />
              <WatchlistWidget />
            </div>
          </div>
        </div>
      ) : (
        <EmptyPortfolioState onCreate={onPortfolioCreate} />
      )}
    </div>
  );
};

// PortfolioSummaryCard.tsx - Portfolio overview card
interface PortfolioSummaryCardProps {
  portfolio: Portfolio;
}

const PortfolioSummaryCard: React.FC<PortfolioSummaryCardProps> = ({
  portfolio
}) => {
  const totalValue = portfolio.totalValue;
  const dayChange = portfolio.dayChange;
  const dayChangePercent = portfolio.dayChangePercent;
  const isPositive = dayChange >= 0;

  return (
    <DashboardWidget
      title="Total Value"
      className="portfolio-summary-card"
    >
      <div className="space-y-2">
        <div className="text-3xl font-bold">
          {formatCurrency(totalValue, portfolio.baseCurrency)}
        </div>

        <div className={cn(
          'flex items-center text-sm',
          isPositive ? 'text-green-600' : 'text-red-600'
        )}>
          {isPositive ? (
            <TrendingUpIcon className="w-4 h-4 mr-1" />
          ) : (
            <TrendingDownIcon className="w-4 h-4 mr-1" />
          )}

          <span>
            {formatCurrency(Math.abs(dayChange), portfolio.baseCurrency)}
            ({isPositive ? '+' : '-'}{Math.abs(dayChangePercent).toFixed(2)}%)
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          Today's change
        </div>
      </div>
    </DashboardWidget>
  );
};

// HoldingsTable.tsx - Portfolio holdings table
interface HoldingsTableProps {
  portfolio: Portfolio;
  onPositionClick?: (position: Position) => void;
}

const HoldingsTable: React.FC<HoldingsTableProps> = ({
  portfolio,
  onPositionClick,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Position;
    direction: 'asc' | 'desc';
  }>({ key: 'marketValue', direction: 'desc' });

  const sortedPositions = useMemo(() => {
    return [...portfolio.positions].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (sortConfig.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [portfolio.positions, sortConfig]);

  const handleSort = (key: keyof Position) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const columns: ColumnDef<Position>[] = [
    {
      header: 'Asset',
      accessorKey: 'symbol',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <AssetIcon type={row.original.assetType} />
          <div>
            <div className="font-medium">{row.original.symbol}</div>
            <div className="text-sm text-muted-foreground">
              {row.original.name}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Quantity',
      accessorKey: 'quantity',
      cell: ({ row }) => (
        <div className="text-right">
          {formatNumber(row.original.quantity)}
        </div>
      ),
    },
    {
      header: 'Avg Cost',
      accessorKey: 'averageCost',
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.averageCost, portfolio.baseCurrency)}
        </div>
      ),
    },
    {
      header: 'Current Price',
      accessorKey: 'currentPrice',
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.currentPrice, portfolio.baseCurrency)}
        </div>
      ),
    },
    {
      header: 'Market Value',
      accessorKey: 'marketValue',
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.marketValue, portfolio.baseCurrency)}
        </div>
      ),
    },
    {
      header: 'P&L',
      accessorKey: 'unrealizedPnL',
      cell: ({ row }) => {
        const pnl = row.original.unrealizedPnL;
        const pnlPercent = row.original.unrealizedPnLPercent;
        const isPositive = pnl >= 0;

        return (
          <div className={cn(
            'text-right',
            isPositive ? 'text-green-600' : 'text-red-600'
          )}>
            <div className="font-medium">
              {isPositive ? '+' : ''}{formatCurrency(pnl, portfolio.baseCurrency)}
            </div>
            <div className="text-sm">
              ({isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%)
            </div>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm">
            <TrendingUpIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontalIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardWidget
      title="Holdings"
      subtitle={`${portfolio.positions.length} positions`}
      className="holdings-table"
    >
      <DataTable
        data={sortedPositions}
        columns={columns}
        onRowClick={onPositionClick}
        className="holdings-data-table"
      />
    </DashboardWidget>
  );
};
```

---

## Accessibility Standards

### WCAG 2.1 AA Compliance Implementation

#### Keyboard Navigation

```typescript
// KeyboardNavigation.tsx - Keyboard accessibility utilities
const useKeyboardNavigation = (
  items: any[],
  onSelect: (item: any) => void
) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(items[focusedIndex]);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
    }
  }, [items, focusedIndex, onSelect]);

  return { focusedIndex, handleKeyDown };
};

// AccessibleButton.tsx - Fully accessible button component
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    disabled,
    children,
    className,
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center',
          'font-medium rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',

          // Size variants
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },

          // Variant styles
          {
            'bg-primary text-primary-foreground focus:ring-primary': variant === 'primary',
            'bg-secondary text-secondary-foreground focus:ring-secondary': variant === 'secondary',
            'bg-transparent hover:bg-accent focus:ring-accent': variant === 'ghost',
          },

          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed',

          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {LeftIcon && <LeftIcon className="mr-2 h-4 w-4" aria-hidden="true" />}

        <span>{children}</span>

        {RightIcon && <RightIcon className="ml-2 h-4 w-4" aria-hidden="true" />}

        {loading && <span className="sr-only">Loading...</span>}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';
```

#### Screen Reader Support

```typescript
// ScreenReaderUtils.tsx - Screen reader utilities
const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({
  children
}) => (
  <span className="sr-only">{children}</span>
);

// Announce changes to screen readers
const useScreenReaderAnnouncement = () => {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return announce;
};

// AccessibleModal.tsx - Fully accessible modal
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  initialFocus?: React.RefObject<HTMLElement>;
}

const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  initialFocus,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;

      // Focus initial element or first focusable element
      const focusTarget = initialFocus?.current ||
        modalRef.current?.querySelector('[tabindex="0"], button, input, select, textarea');

      if (focusTarget && focusTarget instanceof HTMLElement) {
        focusTarget.focus();
      }
    } else {
      // Return focus to previous element
      if (previousFocusRef.current && previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen, initialFocus]);

  // Trap focus within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
      >
        <div className="p-6">
          <h2 id="modal-title" className="text-xl font-semibold mb-4">
            {title}
          </h2>

          {children}

          <div className="flex justify-end mt-6">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

This comprehensive Component Architecture document provides the foundation for building consistent, reusable, and accessible React components across all modules of the Stock Portfolio Management System. Each component follows established patterns for maintainability, performance, and user experience.
