# Components & UI Guide

## UI Component Library

### Basic Components (shadcn/ui)

| Component | Import | Props | Usage |
|-----------|--------|-------|-------|
| Button | `@/components/ui/button` | variant, size, disabled | Actions |
| Card | `@/components/ui/card` | className, children | Containers |
| Input | `@/components/ui/input` | type, placeholder, value | Forms |
| Dialog | `@/components/ui/dialog` | open, onOpenChange | Modals |
| Toast | `@/components/ui/toast` | title, description | Notifications |
| Select | `@/components/ui/select` | options, value | Dropdowns |
| Table | `@/components/ui/table` | columns, data | Data grids |
| Tabs | `@/components/ui/tabs` | defaultValue, children | Navigation |

### Terminal Components

#### TerminalContainerV2
Main terminal container with split screen support
```tsx
import TerminalContainerV2 from '@/modules/workspace/components/Terminal/TerminalContainerV2';

<TerminalContainerV2 project={project} />
```

#### XTermViewV2
Terminal view component
```tsx
import XTermViewV2 from '@/modules/workspace/components/Terminal/XTermViewV2';

<XTermViewV2 
  sessionId={sessionId}
  projectId={projectId}
  type="system|claude"
  isFocused={true}
/>
```

### AI Assistant Components

#### ChatInterfaceWithFolders
Main chat interface with session management
```tsx
import { ChatInterfaceWithFolders } from '@/modules/personal-assistant/components/ChatInterfaceWithFolders';

<ChatInterfaceWithFolders userId={userId} />
```

### Workspace Components

#### FileExplorer
File tree navigation component
```tsx
import { FileExplorer } from '@/modules/workspace/components/Sidebar/FileExplorer';

<FileExplorer 
  projectPath={path}
  onFileSelect={handleFileSelect}
/>
```

## UI Design System

### Color Palette

#### Primary Colors
- Blue: `from-blue-500 to-blue-600`
- Purple: `from-purple-500 to-purple-600`
- Emerald: `from-emerald-500 to-green-500`

#### Neutral Colors
- Background: `bg-gray-900`
- Surface: `bg-gray-800`
- Border: `border-gray-700`
- Text: `text-gray-300`

### Glass Morphism Effects
```css
/* Glass effect */
.glass {
  @apply bg-gray-800/95 backdrop-blur-xl border-gray-700/50;
}

/* Glass with gradient */
.glass-gradient {
  @apply bg-gradient-to-br from-gray-800/95 to-slate-800/95 backdrop-blur-xl;
}
```

### Animation Classes

#### Hover Effects
```css
.hover-lift {
  @apply hover:scale-105 transition-transform duration-200;
}

.hover-glow {
  @apply hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200;
}
```

#### Loading States
```css
.pulse-glow {
  @apply animate-pulse shadow-lg shadow-green-400/50;
}

.spin-slow {
  @apply animate-spin animation-duration-3000;
}
```

## Layout Patterns

### Split Screen Layout
```tsx
<PanelGroup direction="horizontal">
  <Panel defaultSize={50}>
    {/* Left content */}
  </Panel>
  <PanelResizeHandle />
  <Panel defaultSize={50}>
    {/* Right content */}
  </Panel>
</PanelGroup>
```

### Dashboard Layout
```tsx
<DashboardLayout>
  <DashboardHeader />
  <DashboardSidebar />
  <DashboardContent>
    {children}
  </DashboardContent>
</DashboardLayout>
```

## Best Practices

### Component Structure
1. Use TypeScript interfaces for props
2. Export types separately
3. Use default exports for pages
4. Use named exports for components

### State Management
1. Use useState for local state
2. Use useReducer for complex state
3. Use Zustand for global state
4. Use React Query for server state

### Performance
1. Use React.memo for expensive components
2. Use useMemo for expensive calculations
3. Use useCallback for stable callbacks
4. Use lazy loading for heavy components