import type { AppUser, UserRole } from "@/types";

/**
 * Session contract — wire to Auth.js / Clerk / custom auth later.
 */
export interface Session {
  user: AppUser;
  expiresAt: string;
}

export interface AuthService {
  getSession(): Promise<Session | null>;
  requireSession(roles?: UserRole[]): Promise<Session>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
}

export class AuthNotConfiguredError extends Error {
  constructor() {
    super("Authentication provider is not configured yet.");
    this.name = "AuthNotConfiguredError";
  }
}
