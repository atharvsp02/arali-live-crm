import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatAssignmentRole, type AssignmentRole } from "@live-crm/shared";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Mail,
  MapPin,
  UsersRound,
} from "lucide-react";
import { apiRequest } from "../api/client";
import type { AssignmentCollection } from "../api/types";
import { AppHeader } from "../components/AppHeader";
import { NotificationPanel } from "../components/NotificationPanel";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";

export function UserDashboardPage() {
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useNotifications();
  const assignmentsQuery = useQuery({
    queryKey: ["assignments", "me"],
    queryFn: () => apiRequest<AssignmentCollection>("/assignments/me"),
  });
  const assignments = assignmentsQuery.data;
  const companyCount = assignments?.companies.length ?? 0;
  const contactCount = assignments?.contacts.length ?? 0;

  return (
    <div className="app-shell user-shell">
      <AppHeader
        unreadCount={notifications.unreadCount}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />
      <main className="user-main">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow eyebrow-light">Your workspace</span>
            <h1>Welcome back, {user?.name}.</h1>
            <p>
              Stay on top of customer ownership and act on your latest
              assignments.
            </p>
          </div>
          <div className="welcome-orbit">
            <span>
              <BriefcaseBusiness size={28} />
            </span>
          </div>
        </section>

        <section className="user-stat-grid">
          <div className="user-stat">
            <span className="stat-icon stat-violet">
              <Building2 size={21} />
            </span>
            <div>
              <strong>{companyCount}</strong>
              <span>Assigned companies</span>
            </div>
          </div>
          <div className="user-stat">
            <span className="stat-icon stat-blue">
              <UsersRound size={21} />
            </span>
            <div>
              <strong>{contactCount}</strong>
              <span>Assigned contacts</span>
            </div>
          </div>
          <button
            className="user-stat user-stat-action"
            onClick={() => setNotificationsOpen(true)}
          >
            <span className="stat-icon stat-green">
              <CalendarClock size={21} />
            </span>
            <div>
              <strong>{notifications.unreadCount}</strong>
              <span>Unread notifications</span>
            </div>
            <ArrowUpRight size={18} />
          </button>
        </section>

        <section className="dashboard-section">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Accounts</span>
              <h2>Your companies</h2>
              <p>Organizations where you currently own a role.</p>
            </div>
          </div>
          {assignmentsQuery.isLoading ? (
            <div className="card-grid">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="data-card skeleton-card" key={index}>
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : companyCount === 0 ? (
            <div className="empty-state user-empty">
              <Building2 size={36} />
              <h3>No company assignments yet</h3>
              <p>New assignments from your administrator will appear here.</p>
            </div>
          ) : (
            <div className="card-grid">
              {assignments?.companies.map((assignment) => (
                <article
                  className="data-card assignment-card"
                  key={assignment.id}
                >
                  <div className="data-card-top">
                    <span className="entity-icon">
                      <Building2 size={21} />
                    </span>
                    <span className="role-tag">
                      {formatAssignmentRole(assignment.role as AssignmentRole)}
                    </span>
                  </div>
                  <h2>{assignment.company.name}</h2>
                  <p>
                    {assignment.company.description ||
                      "No company description provided."}
                  </p>
                  <div className="assignment-details">
                    <span>
                      <UsersRound size={15} />
                      {assignment.company._count?.contacts ?? 0} contacts
                    </span>
                    <span>
                      <MapPin size={15} />
                      {assignment.company.industry || "General"}
                    </span>
                  </div>
                  <div className="data-card-footer">
                    <span>Assigned by {assignment.assignedBy.name}</span>
                    <span>
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="card-heading">
            <div>
              <span className="eyebrow">People</span>
              <h2>Your contacts</h2>
              <p>Customer contacts assigned directly to you.</p>
            </div>
          </div>
          {!assignmentsQuery.isLoading && contactCount === 0 ? (
            <div className="empty-state user-empty">
              <UsersRound size={36} />
              <h3>No contact assignments yet</h3>
              <p>Assigned customer contacts will appear here.</p>
            </div>
          ) : (
            <div className="card-grid">
              {assignments?.contacts.map((assignment) => (
                <article
                  className="data-card assignment-card"
                  key={assignment.id}
                >
                  <div className="contact-heading">
                    <span className="avatar avatar-large">
                      {assignment.contact.firstName.slice(0, 1)}
                      {assignment.contact.lastName.slice(0, 1)}
                    </span>
                    <div>
                      <h2>
                        {assignment.contact.firstName}{" "}
                        {assignment.contact.lastName}
                      </h2>
                      <span>{assignment.contact.jobTitle || "Contact"}</span>
                    </div>
                  </div>
                  <span className="role-tag contact-role">
                    {formatAssignmentRole(assignment.role as AssignmentRole)}
                  </span>
                  <div className="assignment-details stacked">
                    <span>
                      <Building2 size={15} />
                      {assignment.contact.company?.name || "Independent"}
                    </span>
                    <span>
                      <Mail size={15} />
                      {assignment.contact.email || "No email"}
                    </span>
                  </div>
                  <div className="data-card-footer">
                    <span>Assigned by {assignment.assignedBy.name}</span>
                    <span>
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <NotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications.notifications}
        isLoading={notifications.isLoading}
        isError={notifications.isError}
        isMarkingAll={notifications.isMarkingAll}
        onMarkRead={notifications.markRead}
        onMarkAllRead={notifications.markAllRead}
        onRetry={() => void notifications.refetch()}
      />
    </div>
  );
}
