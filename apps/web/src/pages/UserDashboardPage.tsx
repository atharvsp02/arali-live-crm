import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatAssignmentRole, type AssignmentRole } from "@live-crm/shared";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CircleAlert,
  LayoutDashboard,
  Mail,
  MapPin,
  UsersRound,
} from "lucide-react";
import { apiRequest } from "../api/client";
import type { AssignmentCollection } from "../api/types";
import { AppShell } from "../components/AppShell";
import { NotificationPanel } from "../components/NotificationPanel";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";

function AssignmentLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="empty-state user-empty" role="alert">
      <CircleAlert size={34} />
      <h3>Unable to load assignments</h3>
      <p>Check the connection and try again.</p>
      <button className="button button-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function UserDashboardPage() {
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const notifications = useNotifications();
  const assignmentsQuery = useQuery({
    queryKey: ["assignments", "me"],
    queryFn: () => apiRequest<AssignmentCollection>("/assignments/me"),
  });
  const assignments = assignmentsQuery.data;
  const companyCount = assignments?.companies.length ?? 0;
  const contactCount = assignments?.contacts.length ?? 0;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleCompanies =
    assignments?.companies.filter((assignment) =>
      assignment.company.name.toLowerCase().includes(normalizedSearch),
    ) ?? [];
  const visibleContacts =
    assignments?.contacts.filter((assignment) =>
      `${assignment.contact.firstName} ${assignment.contact.lastName}`
        .toLowerCase()
        .includes(normalizedSearch),
    ) ?? [];
  const navigation = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "companies", label: "My companies", icon: Building2 },
    { id: "contacts", label: "My contacts", icon: UsersRound },
  ];

  function navigate(section: string) {
    setActiveSection(section);
    document
      .getElementById(`user-${section}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <AppShell
      navigation={navigation}
      activeNavigation={activeSection}
      onNavigate={navigate}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search your assignments..."
      unreadCount={notifications.unreadCount}
      onOpenNotifications={() => setNotificationsOpen(true)}
    >
      <div className="user-main">
        <section className="welcome-banner" id="user-overview">
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

        <section className="dashboard-section" id="user-companies">
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
          ) : assignmentsQuery.isError ? (
            <AssignmentLoadError
              onRetry={() => void assignmentsQuery.refetch()}
            />
          ) : companyCount === 0 || visibleCompanies.length === 0 ? (
            <div className="empty-state user-empty">
              <Building2 size={36} />
              <h3>
                {normalizedSearch
                  ? "No matching companies"
                  : "No company assignments yet"}
              </h3>
              <p>
                {normalizedSearch
                  ? "Try a different search term."
                  : "New assignments from your administrator will appear here."}
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {visibleCompanies.map((assignment) => (
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

        <section className="dashboard-section" id="user-contacts">
          <div className="card-heading">
            <div>
              <span className="eyebrow">People</span>
              <h2>Your contacts</h2>
              <p>Customer contacts assigned directly to you.</p>
            </div>
          </div>
          {assignmentsQuery.isLoading ? (
            <div className="card-grid">
              {Array.from({ length: 2 }).map((_, index) => (
                <div className="data-card skeleton-card" key={index}>
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : assignmentsQuery.isError ? (
            <AssignmentLoadError
              onRetry={() => void assignmentsQuery.refetch()}
            />
          ) : contactCount === 0 || visibleContacts.length === 0 ? (
            <div className="empty-state user-empty">
              <UsersRound size={36} />
              <h3>
                {normalizedSearch
                  ? "No matching contacts"
                  : "No contact assignments yet"}
              </h3>
              <p>
                {normalizedSearch
                  ? "Try a different search term."
                  : "Assigned customer contacts will appear here."}
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {visibleContacts.map((assignment) => (
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
      </div>

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
    </AppShell>
  );
}
