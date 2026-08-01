import { useState } from "react";
import { Link } from "react-router-dom";
import {
  SiJsonwebtokens,
  SiPostgresql,
  SiRedis,
  SiSocketdotio,
} from "react-icons/si";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  LayoutDashboard,
  Menu,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { AraliLogo } from "../components/AraliLogo";
import { useAuth } from "../hooks/useAuth";

interface LandingFeature {
  number: string;
  title: string;
  description: string;
  wide?: boolean;
}

const landingFeatures: LandingFeature[] = [
  {
    number: "01",
    title: "Private by design",
    description:
      "Each assignment notification reaches only the team member responsible for that customer.",
    wide: true,
  },
  {
    number: "02",
    title: "Durable history",
    description:
      "Notifications remain available after refresh so important handoffs are never lost.",
  },
  {
    number: "03",
    title: "Automatic follow-ups",
    description:
      "Scheduled reminders keep customer ownership changes from being forgotten.",
  },
  {
    number: "04",
    title: "Clear ownership",
    description:
      "Admins assign companies and contacts with roles while users see only their own records.",
  },
  {
    number: "05",
    title: "Realtime feedback",
    description:
      "Live alerts, unread counts, and notification history keep every handoff visible.",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Choose the relationship",
    description:
      "Create or select a company or contact in the admin workspace.",
  },
  {
    number: "02",
    title: "Assign ownership",
    description:
      "Select one user and a meaningful role, then create the assignment.",
  },
  {
    number: "03",
    title: "Follow through",
    description:
      "The right user receives the live alert and an automatic follow-up reminder.",
  },
];

const architecture = ["Admin", "API", "PostgreSQL", "Redis + BullMQ", "User"];

export function LandingPage() {
  const { user, isLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const workspacePath = user?.systemRole === "ADMIN" ? "/admin" : "/dashboard";
  const actionPath = user ? workspacePath : "/login";
  const actionLabel = user ? "Open workspace" : "Open application";

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <Link className="landing-logo" to="/" aria-label="Arali CRM home">
            <AraliLogo />
          </Link>

          <nav className="landing-nav-links" aria-label="Primary navigation">
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#architecture">Architecture</a>
          </nav>

          <div className="landing-nav-actions">
            {!user && !isLoading ? <Link to="/login">Sign in</Link> : null}
            <Link className="landing-nav-cta" to={actionPath}>
              {actionLabel}
            </Link>
          </div>

          <button
            className="landing-menu-button"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {menuOpen ? (
          <nav className="landing-mobile-nav" aria-label="Mobile navigation">
            <a href="#features" onClick={() => setMenuOpen(false)}>
              Features
            </a>
            <a href="#workflow" onClick={() => setMenuOpen(false)}>
              Workflow
            </a>
            <a href="#architecture" onClick={() => setMenuOpen(false)}>
              Architecture
            </a>
            <Link to={actionPath} onClick={() => setMenuOpen(false)}>
              {actionLabel}
              <ArrowRight size={16} />
            </Link>
          </nav>
        ) : null}
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-cloud landing-cloud-left" />
          <div className="landing-cloud landing-cloud-right" />
          <div className="landing-container landing-hero-content">
            <div className="landing-hero-kicker">
              CRM ownership platform
              <span />
              Assignment workflow
            </div>
            <h1>
              Customer ownership that reaches the right person,
              <span> right now.</span>
            </h1>
            <p>
              Assign companies and contacts with confidence. Arali CRM combines
              private live delivery, durable notifications, and reliable
              automatic follow-ups in one focused workspace.
            </p>
            <div className="landing-hero-actions">
              <Link className="button button-primary" to={actionPath}>
                {actionLabel}
                <ArrowRight size={17} />
              </Link>
              <a className="button landing-muted-button" href="#workflow">
                See how it works
              </a>
            </div>

            <div className="landing-product-frame">
              <div className="landing-browser-bar">
                <span />
                <span />
                <span />
                <div>Interface preview</div>
              </div>
              <div className="landing-product-preview">
                <aside className="landing-preview-sidebar">
                  <div className="landing-preview-brand">
                    <AraliLogo className="arali-logo-preview" />
                  </div>
                  <div className="landing-preview-label">Workspace</div>
                  <div className="landing-preview-link active">
                    <LayoutDashboard size={14} />
                    Overview
                  </div>
                  <div className="landing-preview-link">
                    <Building2 size={14} />
                    My companies
                  </div>
                  <div className="landing-preview-link">
                    <UsersRound size={14} />
                    My contacts
                  </div>
                </aside>

                <div className="landing-preview-main">
                  <div className="landing-preview-header">
                    <div>
                      <Search size={14} />
                      Search your assignments...
                    </div>
                    <span className="landing-preview-bell">
                      <Bell size={15} />
                      <small>2</small>
                    </span>
                    <span className="landing-preview-profile">
                      <span className="landing-preview-avatar">A</span>
                      <strong>Atharv</strong>
                      <ChevronDown size={12} />
                    </span>
                  </div>
                  <div className="landing-preview-content">
                    <span className="eyebrow">Your workspace</span>
                    <h2>Welcome back, Atharv.</h2>
                    <p>
                      Stay on top of customer ownership and act on your latest
                      assignments.
                    </p>
                    <div className="landing-preview-stats">
                      <div>
                        <span className="landing-preview-stat-icon">
                          <Building2 size={16} />
                        </span>
                        <span>
                          <strong>02</strong>
                          <small>Assigned companies</small>
                        </span>
                      </div>
                      <div>
                        <span className="landing-preview-stat-icon">
                          <UsersRound size={16} />
                        </span>
                        <span>
                          <strong>01</strong>
                          <small>Assigned contacts</small>
                        </span>
                      </div>
                      <div>
                        <span className="landing-preview-stat-icon">
                          <CalendarClock size={16} />
                        </span>
                        <span>
                          <strong>02</strong>
                          <small>Unread notifications</small>
                        </span>
                      </div>
                    </div>
                    <div className="landing-preview-section">
                      <div className="landing-preview-section-heading">
                        <span className="eyebrow">Accounts</span>
                        <strong>Your companies</strong>
                        <small>
                          Organizations where you currently own a role.
                        </small>
                      </div>
                      <div className="landing-preview-grid">
                        <div className="landing-preview-assignment-card">
                          <div>
                            <span className="landing-company-icon">
                              <Building2 size={15} />
                            </span>
                            <small>Account owner</small>
                          </div>
                          <strong>Northstar Labs</strong>
                          <span>Software · 3 contacts</span>
                        </div>
                        <div className="landing-preview-assignment-card">
                          <div>
                            <span className="landing-company-icon">
                              <Building2 size={15} />
                            </span>
                            <small>Relationship manager</small>
                          </div>
                          <strong>Acme Corp</strong>
                          <span>Technology · 2 contacts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="landing-notification-card">
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>New assignment</strong>
                    <span>You have been assigned to Northstar Labs.</span>
                  </div>
                  <X size={13} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-stack-strip" aria-label="Technology stack">
          <div className="landing-container">
            <span>Built with a reliable stack</span>
            <div className="landing-stack-logos">
              <div className="landing-stack-item landing-stack-postgres">
                <span className="landing-stack-icon">
                  <SiPostgresql aria-hidden="true" />
                </span>
                <strong>PostgreSQL</strong>
              </div>
              <div className="landing-stack-item landing-stack-socket">
                <span className="landing-stack-icon">
                  <SiSocketdotio aria-hidden="true" />
                </span>
                <strong>Socket.IO</strong>
              </div>
              <div className="landing-stack-item landing-stack-bullmq">
                <span className="landing-stack-icon">
                  <span className="landing-stack-bullmark">
                    <img
                      src="https://bullmq.io/images/bullmq-logo.png"
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </span>
                </span>
                <strong>BullMQ</strong>
              </div>
              <div className="landing-stack-item landing-stack-redis">
                <span className="landing-stack-icon">
                  <SiRedis aria-hidden="true" />
                </span>
                <strong>Redis</strong>
              </div>
              <div className="landing-stack-item landing-stack-jwt">
                <span className="landing-stack-icon">
                  <SiJsonwebtokens aria-hidden="true" />
                </span>
                <strong>JWT</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-features" id="features">
          <div className="landing-container">
            <div className="landing-section-heading">
              <span className="eyebrow">Everything in sync</span>
              <h2>One clear system for customer ownership.</h2>
              <p>
                The important parts of assignment management work together, from
                the first admin action to the final persisted reminder.
              </p>
            </div>
            <div className="landing-bento-grid">
              {landingFeatures.map((feature) => (
                <article
                  className={`landing-feature-card ${feature.wide ? "wide dark" : ""}`}
                  key={feature.title}
                >
                  <span className="landing-feature-number">
                    {feature.number}
                  </span>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                  {feature.wide ? (
                    <div className="landing-private-visual">
                      <span>Admin</span>
                      <i />
                      <strong>Assigned user</strong>
                      <small>Direct notification</small>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-workflow" id="workflow">
          <div className="landing-container">
            <div className="landing-section-heading landing-heading-left">
              <span className="eyebrow">From record to relationship</span>
              <h2>A simple workflow with strong guarantees.</h2>
            </div>
            <div className="landing-workflow-grid">
              {workflowSteps.map((step) => (
                <article key={step.number}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="landing-section landing-architecture"
          id="architecture"
        >
          <div className="landing-container landing-architecture-inner">
            <div className="landing-architecture-copy">
              <span className="eyebrow eyebrow-light">
                Designed for reliability
              </span>
              <h2>Realtime speed without losing durable state.</h2>
              <p>
                The API persists first, targets an authenticated Socket.IO room,
                and schedules follow-up work through Redis. Refreshing the page
                never erases what happened.
              </p>
              <ul>
                <li>Database-backed unread state</li>
                <li>User-specific socket rooms</li>
                <li>Independent background worker</li>
              </ul>
            </div>
            <div className="landing-architecture-flow">
              {architecture.map((item, index) => (
                <div className="landing-flow-item" key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item}</strong>
                  {index < architecture.length - 1 ? (
                    <i className="landing-flow-line" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="landing-container">
            <span className="eyebrow">Get started</span>
            <h2>Bring every customer handoff into one workspace.</h2>
            <p>
              Sign in to manage customer records, assign ownership, and stay
              current with notifications and reminders.
            </p>
            <Link className="button landing-light-button" to={actionPath}>
              {actionLabel}
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-grid">
          <div>
            <Link className="landing-logo" to="/">
              <AraliLogo />
            </Link>
            <p>Focused customer ownership with reliable live delivery.</p>
          </div>
          <div>
            <strong>Product</strong>
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
          </div>
          <div>
            <strong>Technical</strong>
            <a href="#architecture">Architecture</a>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
        <div className="landing-container landing-footer-bottom">
          <span>© {new Date().getFullYear()} Arali CRM</span>
          <span>Customer ownership, clearly assigned.</span>
        </div>
      </footer>
    </div>
  );
}
