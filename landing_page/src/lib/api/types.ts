export type UserRole =
  | "ADMIN"
  | "DOCTOR"
  | "SPECIALIST"
  | "PATIENT"
  | "FAMILY_MEMBER";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  orgId: string;
  organization: string;
  patientProfileId?: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

export interface DemoLeadInput {
  name: string;
  org: string;
  role?: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string;
}
