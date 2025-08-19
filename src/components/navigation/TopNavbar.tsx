import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Menu,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Command,
  Moon,
  Sun,
  Monitor,
  HelpCircle,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { useTheme } from "@/hooks/useTheme";
import Image from "next/image";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  timestamp: Date;
  read: boolean;
}

interface TopNavbarProps {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role?: string;
  } | null;
  notifications?: Notification[];
  onSearch?: (query: string) => void;
  onCommandPalette?: () => void;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  className?: string;
}

const TopNavbar: React.FC<TopNavbarProps> = ({
  user,
  notifications = [],
  onSearch,
  onCommandPalette,
  onMenuClick,
  showMenuButton = true,
  className,
}) => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onCommandPalette?.();
      }
      // Cmd/Ctrl + / for search
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setShowSearchModal(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCommandPalette]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch?.(searchQuery);
      setShowSearchModal(false);
      setSearchQuery("");
    }
  };

  const handleLogout = () => {
    // Clear auth tokens
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    router.push("/login");
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    setShowUserMenu(false);
  };

  return (
    <>
      <nav
        className={cn(
          "top-navbar flex items-center justify-between px-4 h-14",
          className,
        )}
      >
        {/* Left Section */}
        <div className="flex items-center space-x-3">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="md:hidden h-8 w-8 p-0"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex items-center">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search... (⌘/)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 lg:w-80 pl-9 pr-4 h-9"
              />
            </form>
          </div>

          {/* Search Button - Mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearchModal(true)}
            className="md:hidden h-8 w-8 p-0"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Command Palette Button */}
          {onCommandPalette && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCommandPalette}
              className="hidden md:flex items-center space-x-2 h-8 px-3"
            >
              <Command className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">⌘K</span>
            </Button>
          )}

          {/* Notifications */}
          <div ref={notificationRef} className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="h-8 w-8 p-0 relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        Mark all as read
                      </Button>
                    )}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                            !notification.read && "bg-muted/20",
                          )}
                        >
                          <div className="flex items-start space-x-2">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full mt-2",
                                notification.type === "error" &&
                                  "bg-destructive",
                                notification.type === "warning" &&
                                  "bg-yellow-500",
                                notification.type === "success" &&
                                  "bg-green-500",
                                notification.type === "info" && "bg-blue-500",
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(
                                  notification.timestamp,
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {notifications.length > 5 && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      className="w-full h-8 text-sm"
                      onClick={() => router.push("/notifications")}
                    >
                      View all notifications
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div ref={userMenuRef} className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 h-8 px-2"
            >
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.firstName || "User"}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs text-primary-foreground font-medium">
                    {user?.firstName?.[0] || user?.email?.[0] || "U"}
                  </span>
                </div>
              )}
              <span className="hidden md:block text-sm font-medium">
                {user?.firstName || user?.email?.split("@")[0] || "User"}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-popover border rounded-lg shadow-lg z-50">
                {user && (
                  <div className="p-3 border-b">
                    <p className="text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                    {user.role && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {user.role}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="p-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-9 px-3"
                    onClick={() => {
                      router.push("/profile");
                      setShowUserMenu(false);
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-9 px-3"
                    onClick={() => {
                      router.push("/settings");
                      setShowUserMenu(false);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>

                  <div className="my-1 border-t" />

                  {/* Theme Selector */}
                  <div className="px-3 py-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Theme
                    </p>
                    <div className="flex space-x-1">
                      <Button
                        variant={theme === "light" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleThemeChange("light")}
                        className="flex-1 h-7"
                      >
                        <Sun className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={theme === "dark" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleThemeChange("dark")}
                        className="flex-1 h-7"
                      >
                        <Moon className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={theme === "system" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleThemeChange("system")}
                        className="flex-1 h-7"
                      >
                        <Monitor className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="my-1 border-t" />

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-9 px-3"
                    onClick={() => {
                      router.push("/help");
                      setShowUserMenu(false);
                    }}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Help & Support
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-9 px-3 text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden">
          <div className="container mx-auto p-4">
            <div className="bg-card border rounded-lg shadow-lg p-4">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowSearchModal(false);
                      setSearchQuery("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Search</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

TopNavbar.displayName = "TopNavbar";

export default TopNavbar;
export type { TopNavbarProps, Notification };
