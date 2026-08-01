import { useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeft,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface AppHeaderProps {
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onToggleMobile: () => void;
  onExpandSidebar: () => void;
  sidebarCollapsed: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
}

export function AppHeader({
  unreadCount = 0,
  onOpenNotifications,
  onToggleMobile,
  onExpandSidebar,
  sidebarCollapsed,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  const initials =
    user?.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";

  return (
    <header className="app-header">
      <div className="header-search-group">
        <button
          className="icon-button mobile-menu-button"
          onClick={onToggleMobile}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        {sidebarCollapsed ? (
          <button
            className="icon-button sidebar-expand-button"
            onClick={onExpandSidebar}
            aria-label="Expand navigation"
          >
            <PanelLeft size={18} />
          </button>
        ) : null}
        <label className="header-search">
          <Search size={17} />
          <span className="sr-only">Search workspace</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>
      </div>

      <div className="header-actions">
        {onOpenNotifications ? (
          <button
            className="notification-button"
            onClick={onOpenNotifications}
            aria-label={`Open notifications, ${unreadCount} unread`}
          >
            <Bell size={19} />
            {unreadCount > 0 ? (
              <span>{unreadCount > 99 ? "99+" : unreadCount}</span>
            ) : null}
          </button>
        ) : null}

        <div className="profile-menu-wrap">
          <button
            className="profile-trigger"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="avatar">{initials}</span>
            <span className="profile-name">{user?.name}</span>
            <ChevronDown size={15} />
          </button>

          {profileOpen ? (
            <div className="profile-dropdown" role="menu">
              <div className="profile-dropdown-copy">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <button role="menuitem" onClick={() => void signOut()}>
                <LogOut size={16} />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
