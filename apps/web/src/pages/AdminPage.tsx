import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ASSIGNMENT_ROLES,
  companySchema,
  contactSchema,
  formatAssignmentRole,
  type AssignmentRole,
  type CompanyInput,
  type ContactInput,
} from "@live-crm/shared";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  LayoutDashboard,
  Plus,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { z } from "zod";
import { apiRequest, ApiClientError } from "../api/client";
import type {
  AssignmentCollection,
  Company,
  Contact,
  User,
} from "../api/types";
import { AppHeader } from "../components/AppHeader";
import { useToast } from "../components/ToastProvider";

type AdminTab = "overview" | "companies" | "contacts" | "assignments";

const tabs: Array<{
  id: AdminTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "contacts", label: "Contacts", icon: UsersRound },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
];

const assignmentFormSchema = z.object({
  targetType: z.enum(["COMPANY", "CONTACT"]),
  targetId: z.string().min(1, "Select a target"),
  userId: z.string().min(1, "Select a user"),
  role: z.enum(ASSIGNMENT_ROLES),
});

type AssignmentFormInput = z.infer<typeof assignmentFormSchema>;

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

function DataLoading() {
  return (
    <div className="card-grid">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="data-card skeleton-card" key={index}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function DataError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <CircleAlert size={36} />
      <h3>Unable to load this data</h3>
      <p>Check the connection and try again.</p>
      <button className="button button-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function Overview({
  companies,
  contacts,
  assignments,
  onNavigate,
}: {
  companies: Company[];
  contacts: Contact[];
  assignments?: AssignmentCollection;
  onNavigate: (tab: AdminTab) => void;
}) {
  const assignmentCount =
    (assignments?.companies.length ?? 0) + (assignments?.contacts.length ?? 0);
  const recent = [
    ...(assignments?.companies.map((assignment) => ({
      id: assignment.id,
      target: assignment.company.name,
      type: "Company",
      user: assignment.user?.name ?? "Unknown",
      role: assignment.role,
      createdAt: assignment.createdAt,
    })) ?? []),
    ...(assignments?.contacts.map((assignment) => ({
      id: assignment.id,
      target: `${assignment.contact.firstName} ${assignment.contact.lastName}`,
      type: "Contact",
      user: assignment.user?.name ?? "Unknown",
      role: assignment.role,
      createdAt: assignment.createdAt,
    })) ?? []),
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <>
      <SectionHeading
        eyebrow="Admin workspace"
        title="Good to see you."
        description="Create customer records, assign ownership, and monitor recent activity."
      />
      <div className="stat-grid">
        <button className="stat-card" onClick={() => onNavigate("companies")}>
          <span className="stat-icon stat-violet">
            <Building2 size={22} />
          </span>
          <div>
            <strong>{companies.length}</strong>
            <span>Companies</span>
          </div>
          <ArrowUpRight size={18} />
        </button>
        <button className="stat-card" onClick={() => onNavigate("contacts")}>
          <span className="stat-icon stat-blue">
            <UsersRound size={22} />
          </span>
          <div>
            <strong>{contacts.length}</strong>
            <span>Contacts</span>
          </div>
          <ArrowUpRight size={18} />
        </button>
        <button className="stat-card" onClick={() => onNavigate("assignments")}>
          <span className="stat-icon stat-green">
            <ClipboardList size={22} />
          </span>
          <div>
            <strong>{assignmentCount}</strong>
            <span>Assignments</span>
          </div>
          <ArrowUpRight size={18} />
        </button>
      </div>
      <section className="content-card">
        <div className="card-heading">
          <div>
            <h2>Recent assignments</h2>
            <p>The latest customer ownership changes.</p>
          </div>
          <button
            className="text-button"
            onClick={() => onNavigate("assignments")}
          >
            View all
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state compact">
            <ClipboardList size={32} />
            <h3>No assignments yet</h3>
            <p>Create the first assignment to start the live workflow.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Type</th>
                  <th>Assigned to</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.target}</strong>
                    </td>
                    <td>
                      <span className="tag">{item.type}</span>
                    </td>
                    <td>{item.user}</td>
                    <td>{formatAssignmentRole(item.role)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function CompaniesSection({
  companies,
  isLoading,
  isError,
  onRetry,
}: {
  companies: Company[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const form = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      website: "",
      industry: "",
      description: "",
    },
  });
  const createCompany = useMutation({
    mutationFn: (input: CompanyInput) =>
      apiRequest<Company>("/companies", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      form.reset();
      setShowForm(false);
      showToast({ title: "Company created", tone: "success" });
    },
    onError: (error) => {
      form.setError("root", {
        message:
          error instanceof ApiClientError
            ? error.message
            : "Unable to create company",
      });
    },
  });
  const filtered = companies.filter((company) =>
    company.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <SectionHeading
        eyebrow="Customer records"
        title="Companies"
        description="Create and manage the organizations your team works with."
      />
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search companies"
          />
        </label>
        <button
          className="button button-primary"
          onClick={() => setShowForm((current) => !current)}
        >
          <Plus size={18} />
          New company
        </button>
      </div>

      {showForm ? (
        <section className="content-card form-card">
          <div className="card-heading">
            <div>
              <h2>Create company</h2>
              <p>Add the essential account details.</p>
            </div>
          </div>
          <form
            className="form-grid"
            onSubmit={form.handleSubmit((input) => createCompany.mutate(input))}
          >
            <label>
              Company name
              <input {...form.register("name")} placeholder="Acme Corp" />
              {form.formState.errors.name ? (
                <span className="field-error">
                  {form.formState.errors.name.message}
                </span>
              ) : null}
            </label>
            <label>
              Website
              <input
                {...form.register("website")}
                placeholder="https://example.com"
              />
              {form.formState.errors.website ? (
                <span className="field-error">
                  {form.formState.errors.website.message}
                </span>
              ) : null}
            </label>
            <label>
              Industry
              <input {...form.register("industry")} placeholder="Software" />
            </label>
            <label className="form-span">
              Description
              <textarea
                {...form.register("description")}
                rows={3}
                placeholder="A short account summary"
              />
            </label>
            {form.formState.errors.root ? (
              <div className="form-error form-span">
                {form.formState.errors.root.message}
              </div>
            ) : null}
            <div className="form-actions form-span">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={createCompany.isPending}
              >
                {createCompany.isPending ? "Creating" : "Create company"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {isLoading ? (
        <DataLoading />
      ) : isError ? (
        <DataError onRetry={onRetry} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Building2 size={36} />
          <h3>{search ? "No matching companies" : "No companies yet"}</h3>
          <p>
            {search
              ? "Try a different search term."
              : "Create a company to begin managing customer ownership."}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((company) => (
            <article className="data-card" key={company.id}>
              <div className="data-card-top">
                <span className="entity-icon">
                  <Building2 size={21} />
                </span>
                <span className="tag">{company.industry || "General"}</span>
              </div>
              <h2>{company.name}</h2>
              <p>{company.description || "No description provided."}</p>
              <div className="data-card-footer">
                <span>{company._count?.contacts ?? 0} contacts</span>
                <span>{company._count?.assignments ?? 0} assignments</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function ContactsSection({
  contacts,
  companies,
  isLoading,
  isError,
  onRetry,
}: {
  contacts: Contact[];
  companies: Company[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      jobTitle: "",
      companyId: "",
    },
  });
  const createContact = useMutation({
    mutationFn: (input: ContactInput) =>
      apiRequest<Contact>("/contacts", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      form.reset();
      setShowForm(false);
      showToast({ title: "Contact created", tone: "success" });
    },
    onError: (error) => {
      form.setError("root", {
        message:
          error instanceof ApiClientError
            ? error.message
            : "Unable to create contact",
      });
    },
  });
  const filtered = contacts.filter((contact) =>
    `${contact.firstName} ${contact.lastName} ${contact.email ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <>
      <SectionHeading
        eyebrow="People"
        title="Contacts"
        description="Link customer contacts to companies and keep ownership clear."
      />
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search contacts"
          />
        </label>
        <button
          className="button button-primary"
          onClick={() => setShowForm((current) => !current)}
        >
          <UserPlus size={18} />
          New contact
        </button>
      </div>

      {showForm ? (
        <section className="content-card form-card">
          <div className="card-heading">
            <div>
              <h2>Create contact</h2>
              <p>Add a person and optionally link a company.</p>
            </div>
          </div>
          <form
            className="form-grid"
            onSubmit={form.handleSubmit((input) => createContact.mutate(input))}
          >
            <label>
              First name
              <input {...form.register("firstName")} placeholder="Alice" />
              {form.formState.errors.firstName ? (
                <span className="field-error">
                  {form.formState.errors.firstName.message}
                </span>
              ) : null}
            </label>
            <label>
              Last name
              <input {...form.register("lastName")} placeholder="Johnson" />
              {form.formState.errors.lastName ? (
                <span className="field-error">
                  {form.formState.errors.lastName.message}
                </span>
              ) : null}
            </label>
            <label>
              Email
              <input
                type="email"
                {...form.register("email")}
                placeholder="alice@example.com"
              />
            </label>
            <label>
              Phone
              <input
                {...form.register("phone")}
                placeholder="+91 98765 43210"
              />
            </label>
            <label>
              Job title
              <input {...form.register("jobTitle")} placeholder="CTO" />
            </label>
            <label>
              Company
              <select {...form.register("companyId")}>
                <option value="">No company</option>
                {companies.map((company) => (
                  <option value={company.id} key={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            {form.formState.errors.root ? (
              <div className="form-error form-span">
                {form.formState.errors.root.message}
              </div>
            ) : null}
            <div className="form-actions form-span">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={createContact.isPending}
              >
                {createContact.isPending ? "Creating" : "Create contact"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {isLoading ? (
        <DataLoading />
      ) : isError ? (
        <DataError onRetry={onRetry} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <UsersRound size={36} />
          <h3>{search ? "No matching contacts" : "No contacts yet"}</h3>
          <p>
            {search
              ? "Try a different search term."
              : "Create a contact and link them to a company."}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((contact) => (
            <article className="data-card" key={contact.id}>
              <div className="contact-heading">
                <span className="avatar avatar-large">
                  {contact.firstName.slice(0, 1)}
                  {contact.lastName.slice(0, 1)}
                </span>
                <div>
                  <h2>
                    {contact.firstName} {contact.lastName}
                  </h2>
                  <span>{contact.jobTitle || "Contact"}</span>
                </div>
              </div>
              <p>{contact.email || "No email provided"}</p>
              <div className="data-card-footer">
                <span>{contact.company?.name || "Independent"}</span>
                <span>{contact._count?.assignments ?? 0} assignments</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function AssignmentsSection({
  companies,
  contacts,
  users,
  assignments,
}: {
  companies: Company[];
  contacts: Contact[];
  users: User[];
  assignments?: AssignmentCollection;
}) {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const form = useForm<AssignmentFormInput>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      targetType: "COMPANY",
      targetId: "",
      userId: "",
      role: "ACCOUNT_OWNER",
    },
  });
  const targetType = form.watch("targetType");
  const createAssignment = useMutation({
    mutationFn: (input: AssignmentFormInput) => {
      const targetKey =
        input.targetType === "COMPANY" ? "companyId" : "contactId";
      const path =
        input.targetType === "COMPANY"
          ? "/assignments/companies"
          : "/assignments/contacts";

      return apiRequest(path, {
        method: "POST",
        body: JSON.stringify({
          [targetKey]: input.targetId,
          userId: input.userId,
          role: input.role,
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assignments"] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      form.reset({
        targetType,
        targetId: "",
        userId: "",
        role: targetType === "COMPANY" ? "ACCOUNT_OWNER" : "CONTACT_OWNER",
      });
      showToast({
        title: "Assignment created",
        message: "The assigned user has been notified.",
        tone: "success",
      });
    },
    onError: (error) => {
      form.setError("root", {
        message:
          error instanceof ApiClientError
            ? error.message
            : "Unable to create assignment",
      });
    },
  });
  const recent = useMemo(
    () =>
      [
        ...(assignments?.companies.map((assignment) => ({
          id: assignment.id,
          target: assignment.company.name,
          type: "Company",
          user: assignment.user?.name ?? "Unknown",
          role: assignment.role,
          createdAt: assignment.createdAt,
        })) ?? []),
        ...(assignments?.contacts.map((assignment) => ({
          id: assignment.id,
          target: `${assignment.contact.firstName} ${assignment.contact.lastName}`,
          type: "Contact",
          user: assignment.user?.name ?? "Unknown",
          role: assignment.role,
          createdAt: assignment.createdAt,
        })) ?? []),
      ].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
    [assignments],
  );

  return (
    <>
      <SectionHeading
        eyebrow="Ownership"
        title="Assignments"
        description="Assign a company or contact and notify the selected user instantly."
      />
      <div className="assignment-layout">
        <section className="content-card">
          <div className="card-heading">
            <div>
              <h2>Create assignment</h2>
              <p>The notification is stored before it is delivered.</p>
            </div>
            <span className="live-pill">
              <span />
              Live
            </span>
          </div>
          <form
            className="form-stack"
            onSubmit={form.handleSubmit((input) =>
              createAssignment.mutate(input),
            )}
          >
            <label>
              Target type
              <select
                {...form.register("targetType", {
                  onChange: (event) => {
                    form.setValue("targetId", "");
                    form.setValue(
                      "role",
                      event.target.value === "COMPANY"
                        ? "ACCOUNT_OWNER"
                        : "CONTACT_OWNER",
                    );
                  },
                })}
              >
                <option value="COMPANY">Company</option>
                <option value="CONTACT">Contact</option>
              </select>
            </label>
            <label>
              {targetType === "COMPANY" ? "Company" : "Contact"}
              <select {...form.register("targetId")}>
                <option value="">Select a target</option>
                {targetType === "COMPANY"
                  ? companies.map((company) => (
                      <option value={company.id} key={company.id}>
                        {company.name}
                      </option>
                    ))
                  : contacts.map((contact) => (
                      <option value={contact.id} key={contact.id}>
                        {contact.firstName} {contact.lastName}
                      </option>
                    ))}
              </select>
              {form.formState.errors.targetId ? (
                <span className="field-error">
                  {form.formState.errors.targetId.message}
                </span>
              ) : null}
            </label>
            <label>
              Assign to
              <select {...form.register("userId")}>
                <option value="">Select a user</option>
                {users.map((user) => (
                  <option value={user.id} key={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              {form.formState.errors.userId ? (
                <span className="field-error">
                  {form.formState.errors.userId.message}
                </span>
              ) : null}
            </label>
            <label>
              Assignment role
              <select {...form.register("role")}>
                {ASSIGNMENT_ROLES.map((role) => (
                  <option value={role} key={role}>
                    {formatAssignmentRole(role)}
                  </option>
                ))}
              </select>
            </label>
            {form.formState.errors.root ? (
              <div className="form-error">
                {form.formState.errors.root.message}
              </div>
            ) : null}
            <button
              className="button button-primary button-full"
              disabled={createAssignment.isPending}
            >
              <CheckCircle2 size={18} />
              {createAssignment.isPending
                ? "Creating assignment"
                : "Create and notify"}
            </button>
          </form>
        </section>

        <section className="content-card">
          <div className="card-heading">
            <div>
              <h2>How delivery works</h2>
              <p>The secure path from assignment to reminder.</p>
            </div>
          </div>
          <ol className="delivery-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Persist atomically</strong>
                <p>The assignment and alert commit in one transaction.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Deliver privately</strong>
                <p>Only the verified recipient room receives the event.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Follow up reliably</strong>
                <p>A background worker creates the delayed reminder.</p>
              </div>
            </li>
          </ol>
        </section>
      </div>

      <section className="content-card">
        <div className="card-heading">
          <div>
            <h2>Assignment history</h2>
            <p>Company and contact ownership in one view.</p>
          </div>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state compact">
            <ClipboardList size={32} />
            <h3>No assignments yet</h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Type</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.target}</strong>
                    </td>
                    <td>
                      <span className="tag">{item.type}</span>
                    </td>
                    <td>{item.user}</td>
                    <td>{formatAssignmentRole(item.role as AssignmentRole)}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: () => apiRequest<Company[]>("/companies"),
  });
  const contactsQuery = useQuery({
    queryKey: ["contacts"],
    queryFn: () => apiRequest<Contact[]>("/contacts"),
  });
  const usersQuery = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: () => apiRequest<User[]>("/users?systemRole=USER"),
  });
  const assignmentsQuery = useQuery({
    queryKey: ["assignments", "all"],
    queryFn: () => apiRequest<AssignmentCollection>("/assignments"),
  });
  const companies = companiesQuery.data ?? [];
  const contacts = contactsQuery.data ?? [];

  return (
    <div className="app-shell">
      <AppHeader />
      <div className="workspace">
        <aside className="sidebar">
          <span className="sidebar-label">Workspace</span>
          <nav>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  className={activeTab === tab.id ? "active" : ""}
                  onClick={() => setActiveTab(tab.id)}
                  key={tab.id}
                >
                  <Icon size={19} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-status">
            <span>
              <span />
            </span>
            <div>
              <strong>Systems operational</strong>
              <small>Live delivery is ready</small>
            </div>
          </div>
        </aside>
        <main className="workspace-main">
          {activeTab === "overview" ? (
            <Overview
              companies={companies}
              contacts={contacts}
              assignments={assignmentsQuery.data}
              onNavigate={setActiveTab}
            />
          ) : null}
          {activeTab === "companies" ? (
            <CompaniesSection
              companies={companies}
              isLoading={companiesQuery.isLoading}
              isError={companiesQuery.isError}
              onRetry={() => void companiesQuery.refetch()}
            />
          ) : null}
          {activeTab === "contacts" ? (
            <ContactsSection
              contacts={contacts}
              companies={companies}
              isLoading={contactsQuery.isLoading}
              isError={contactsQuery.isError}
              onRetry={() => void contactsQuery.refetch()}
            />
          ) : null}
          {activeTab === "assignments" ? (
            <AssignmentsSection
              companies={companies}
              contacts={contacts}
              users={usersQuery.data ?? []}
              assignments={assignmentsQuery.data}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
