import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCheck,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import type { NotificationPayload } from "@live-crm/shared";

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationPayload[];
  isLoading: boolean;
  isError: boolean;
  isMarkingAll: boolean;
  onMarkRead: (id: string) => Promise<unknown>;
  onMarkAllRead: () => Promise<unknown>;
  onRetry: () => void;
}

function NotificationIcon({
  notification,
}: {
  notification: NotificationPayload;
}) {
  if (notification.type === "FOLLOW_UP_REMINDER") {
    return <BriefcaseBusiness size={18} />;
  }

  if (notification.type === "CONTACT_ASSIGNED") {
    return <UserRound size={18} />;
  }

  return <Building2 size={18} />;
}

export function NotificationPanel(props: NotificationPanelProps) {
  if (!props.open) {
    return null;
  }

  return (
    <>
      <button
        className="drawer-backdrop"
        onClick={props.onClose}
        aria-label="Close notifications"
      />
      <aside className="notification-drawer" aria-label="Notifications">
        <header className="drawer-header">
          <div>
            <span className="eyebrow">Inbox</span>
            <h2>Notifications</h2>
          </div>
          <button
            className="icon-button"
            onClick={props.onClose}
            aria-label="Close notifications"
          >
            <X size={20} />
          </button>
        </header>

        <div className="drawer-actions">
          <button
            className="text-button"
            onClick={() => void props.onMarkAllRead()}
            disabled={props.isMarkingAll}
          >
            <CheckCheck size={17} />
            Mark all as read
          </button>
        </div>

        <div className="notification-list">
          {props.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div className="notification-skeleton" key={index}>
                <span />
                <div>
                  <span />
                  <span />
                </div>
              </div>
            ))
          ) : props.isError ? (
            <div className="empty-state compact">
              <RefreshCw size={28} />
              <h3>Unable to load notifications</h3>
              <button
                className="button button-secondary"
                onClick={props.onRetry}
              >
                Try again
              </button>
            </div>
          ) : props.notifications.length === 0 ? (
            <div className="empty-state compact">
              <Bell size={32} />
              <h3>You are all caught up</h3>
              <p>New assignments and reminders will appear here.</p>
            </div>
          ) : (
            props.notifications.map((notification) => (
              <article
                className={`notification-item ${
                  notification.readAt ? "" : "notification-unread"
                }`}
                key={notification.id}
              >
                <span className="notification-icon">
                  <NotificationIcon notification={notification} />
                </span>
                <div className="notification-copy">
                  <div>
                    <h3>{notification.title}</h3>
                    {!notification.readAt ? (
                      <span className="unread-dot" aria-label="Unread" />
                    ) : null}
                  </div>
                  <p>{notification.message}</p>
                  <div className="notification-meta">
                    <span>
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {!notification.readAt ? (
                      <button
                        onClick={() => void props.onMarkRead(notification.id)}
                      >
                        <Check size={14} />
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
