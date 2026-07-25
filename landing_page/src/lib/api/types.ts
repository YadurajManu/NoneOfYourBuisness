export type UserRole =
  | "ADMIN"
  | "CARE_COORDINATOR"
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
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

export type AiMessageRole = "USER" | "ASSISTANT";

export interface AiConversationSummary {
  id: string;
  title: string | null;
  patientId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiChatMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
}

export interface AiConversationDetail extends AiConversationSummary {
  messages: AiChatMessage[];
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
