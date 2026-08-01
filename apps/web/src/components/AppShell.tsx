import { useState, type ReactNode } from "react";
import { PanelLeftClose, type LucideIcon } from "lucide-react";
import { AppHeader } from "./AppHeader";
import { AraliLogo } from "./AraliLogo";

export interface AppNavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface AppShellProps {
  children: ReactNode;
  navigation: AppNavigationItem[];
  activeNavigation: string;
  onNavigate: (id: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  unreadCount?: number;
  onOpenNotifications?: () => void;
}

export function AppShell({
  children,
  navigation,
  activeNavigation,
  onNavigate,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  unreadCount,
  onOpenNotifications,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function navigate(id: string) {
    onNavigate(id);
    setMobileOpen(false);
  }

  return (
    <div className={`cloud-app ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen ? (
        <button
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand-row">
          <button
            className="brand sidebar-brand"
            onClick={() => navigate(navigation[0]?.id ?? "")}
          >
            <AraliLogo />
          </button>
          {!collapsed ? (
            <button
              className="icon-button sidebar-collapse-button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse navigation"
            >
              <PanelLeftClose size={17} />
            </button>
          ) : null}
        </div>

        <nav className="sidebar-nav" aria-label="Workspace navigation">
          <span className="sidebar-label">Workspace</span>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeNavigation === item.id ? "active" : ""}
                onClick={() => navigate(item.id)}
                key={item.id}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="app-frame">
        <AppHeader
          unreadCount={unreadCount}
          onOpenNotifications={onOpenNotifications}
          onToggleMobile={() => setMobileOpen(true)}
          onExpandSidebar={() => setCollapsed(false)}
          sidebarCollapsed={collapsed}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
