import type {
  AssignmentRole,
  AssignmentType,
  NotificationType,
  SystemRole,
} from "./constants.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  systemRole: SystemRole;
}

export interface NotificationMetadata {
  entityType: AssignmentType;
  entityId: string;
  entityName: string;
  assignmentRole: AssignmentRole;
  assignmentId: string;
  assignedByUserId: string;
  deduplicationKey?: string;
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: NotificationMetadata;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationEvent {
  userId: string;
  notification: NotificationPayload;
}

export interface AssignmentReminderJob {
  assignmentType: AssignmentType;
  assignmentId: string;
  userId: string;
  entityId: string;
  entityName: string;
  assignmentRole: AssignmentRole;
  assignedByUserId: string;
}

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
