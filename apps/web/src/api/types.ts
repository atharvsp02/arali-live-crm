import type {
  AssignmentRole,
  NotificationPayload,
  SystemRole,
} from "@live-crm/shared";

export interface User {
  id: string;
  name: string;
  email: string;
  systemRole: SystemRole;
}

export interface Company {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  createdAt?: string;
  _count?: {
    contacts: number;
    assignments: number;
  };
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  companyId?: string | null;
  createdAt?: string;
  company?: Pick<Company, "id" | "name"> | null;
  _count?: {
    assignments: number;
  };
}

export interface CompanyAssignment {
  id: string;
  role: AssignmentRole;
  createdAt: string;
  company: Company;
  user?: Pick<User, "id" | "name" | "email">;
  assignedBy: Pick<User, "id" | "name">;
}

export interface ContactAssignment {
  id: string;
  role: AssignmentRole;
  createdAt: string;
  contact: Contact;
  user?: Pick<User, "id" | "name" | "email">;
  assignedBy: Pick<User, "id" | "name">;
}

export interface AssignmentCollection {
  companies: CompanyAssignment[];
  contacts: ContactAssignment[];
}

export interface NotificationPage {
  items: NotificationPayload[];
  page: number;
  limit: number;
  total: number;
  unreadCount: number;
}
