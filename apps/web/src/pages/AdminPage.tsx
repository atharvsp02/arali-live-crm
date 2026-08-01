import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ASSIGNMENT_ROLES,
  companySchema,
  contactSchema,
  createUserSchema,
  formatAssignmentRole,
  type AssignmentRole,
  type CompanyInput,
  type ContactInput,
  type CreateUserInput,
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
import { AppShell } from "../components/AppShell";
import { useToast } from "../components/ToastProvider";

type AdminTab = "overview" | "companies" | "contacts" | "team" | "assignments";

const tabs: Array<{
  id: AdminTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "contacts", label: "Contacts", icon: UsersRound },
  { id: "team", label: "Team", icon: UserPlus },
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
            <p>Create the first assignment to begin tracking ownership.</p>
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
  search,
  onSearchChange,
}: {
  companies: Company[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const queryClient = useQueryClient();
  const showToast = useToast();
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
            onChange={(event) => onSearchChange(event.target.value)}
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
  search,
  onSearchChange,
}: {
  contacts: Contact[];
  companies: Company[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const queryClient = useQueryClient();
  const showToast = useToast();
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
            onChange={(event) => onSearchChange(event.target.value)}
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

function TeamSection({
  users,
  isLoading,
  isError,
  onRetry,
  search,
  onSearchChange,
}: {
  users: User[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [showForm, setShowForm] = useState(false);
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });
  const createUser = useMutation({
    mutationFn: (input: CreateUserInput) =>
      apiRequest<User>("/users", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      form.reset();
      setShowForm(false);
      showToast({
        title: "Team member created",
        message: "They can now sign in with the credentials you set.",
        tone: "success",
      });
    },
    onError: (error) => {
      form.setError("root", {
        message:
          error instanceof ApiClientError
            ? error.message
            : "Unable to create team member",
      });
    },
  });
  const filtered = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <SectionHeading
        eyebrow="Workspace access"
        title="Team"
        description="Create user accounts and make them available for assignments."
      />
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search team members"
          />
        </label>
        <button
          className="button button-primary"
          onClick={() => setShowForm((current) => !current)}
        >
          <UserPlus size={18} />
          New team member
        </button>
      </div>

      {showForm ? (
        <section className="content-card form-card">
          <div className="card-heading">
            <div>
              <h2>Create team member</h2>
              <p>Set the credentials they will use to sign in.</p>
            </div>
          </div>
          <form
            className="form-grid"
            onSubmit={form.handleSubmit((input) => createUser.mutate(input))}
          >
            <label>
              Full name
              <input
                {...form.register("name")}
                autoComplete="name"
                placeholder="Jordan Lee"
              />
              {form.formState.errors.name ? (
                <span className="field-error">
                  {form.formState.errors.name.message}
                </span>
              ) : null}
            </label>
            <label>
              Email
              <input
                type="email"
                {...form.register("email")}
                autoComplete="email"
                placeholder="jordan@company.com"
              />
              {form.formState.errors.email ? (
                <span className="field-error">
                  {form.formState.errors.email.message}
                </span>
              ) : null}
            </label>
            <label className="form-span">
              Temporary password
              <input
                type="password"
                {...form.register("password")}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
              {form.formState.errors.password ? (
                <span className="field-error">
                  {form.formState.errors.password.message}
                </span>
              ) : null}
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
                onClick={() => {
                  form.reset();
                  setShowForm(false);
                }}
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={createUser.isPending}
              >
                {createUser.isPending ? "Creating" : "Create team member"}
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
          <UserPlus size={36} />
          <h3>{search ? "No matching team members" : "No team members yet"}</h3>
          <p>
            {search
              ? "Try a different search term."
              : "Create a user account before assigning customer records."}
          </p>
        </div>
      ) : (
        <section className="content-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Access</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className="tag">User</span>
                    </td>
                    <td>
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "Not available"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
              <p>The selected team member will be notified immediately.</p>
            </div>
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
              <h2>What happens next</h2>
              <p>A clear handoff for every customer relationship.</p>
            </div>
          </div>
          <ol className="delivery-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Ownership updates</strong>
                <p>The selected user becomes responsible for the record.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Notification sent</strong>
                <p>They receive a private notification immediately.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Reminder follows</strong>
                <p>A follow-up notification arrives automatically.</p>
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
  const [search, setSearch] = useState("");
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

  function navigate(tab: AdminTab) {
    setActiveTab(tab);
    setSearch("");
  }

  function updateSearch(value: string) {
    if (activeTab === "overview" || activeTab === "assignments") {
      setActiveTab("companies");
    }
    setSearch(value);
  }

  return (
    <AppShell
      navigation={tabs}
      activeNavigation={activeTab}
      onNavigate={(id) => navigate(id as AdminTab)}
      searchValue={search}
      onSearchChange={updateSearch}
      searchPlaceholder={
        activeTab === "contacts"
          ? "Search contacts..."
          : activeTab === "team"
            ? "Search team members..."
            : "Search companies..."
      }
    >
      <div className="workspace-main">
        {activeTab === "overview" ? (
          <Overview
            companies={companies}
            contacts={contacts}
            assignments={assignmentsQuery.data}
            onNavigate={navigate}
          />
        ) : null}
        {activeTab === "companies" ? (
          <CompaniesSection
            companies={companies}
            isLoading={companiesQuery.isLoading}
            isError={companiesQuery.isError}
            onRetry={() => void companiesQuery.refetch()}
            search={search}
            onSearchChange={setSearch}
          />
        ) : null}
        {activeTab === "contacts" ? (
          <ContactsSection
            contacts={contacts}
            companies={companies}
            isLoading={contactsQuery.isLoading}
            isError={contactsQuery.isError}
            onRetry={() => void contactsQuery.refetch()}
            search={search}
            onSearchChange={setSearch}
          />
        ) : null}
        {activeTab === "team" ? (
          <TeamSection
            users={usersQuery.data ?? []}
            isLoading={usersQuery.isLoading}
            isError={usersQuery.isError}
            onRetry={() => void usersQuery.refetch()}
            search={search}
            onSearchChange={setSearch}
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
      </div>
    </AppShell>
  );
}
