import type { AuthenticatedUser } from "@live-crm/shared";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
