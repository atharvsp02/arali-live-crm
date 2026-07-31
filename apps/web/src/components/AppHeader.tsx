import { Bell, Building2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface AppHeaderProps {
  unreadCount?: number;
  onOpenNotifications?: () => void;
}

export function AppHeader({
  unreadCount = 0,
  onOpenNotifications,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">
          <Building2 size={21} />
        </span>
        <span>Arali CRM</span>
      </div>
      <div className="header-actions">
        {onOpenNotifications ? (
          <button
            className="notification-button"
            onClick={onOpenNotifications}
            aria-label={`Open notifications, ${unreadCount} unread`}
          >
            <Bell size={20} />
            {unreadCount > 0 ? (
              <span>{unreadCount > 99 ? "99+" : unreadCount}</span>
            ) : null}
          </button>
        ) : null}
        <div className="user-menu-copy">
          <strong>{user?.name}</strong>
          <span>
            {user?.systemRole === "ADMIN" ? "Administrator" : "Team member"}
          </span>
        </div>
        <span className="avatar">{user?.name.slice(0, 1).toUpperCase()}</span>
        <button className="icon-button" onClick={signOut} aria-label="Sign out">
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}
