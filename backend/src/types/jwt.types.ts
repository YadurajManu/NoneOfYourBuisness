import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  orgId: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  orgId: string;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

export class LoginDto {
  email: string;
  password: string;
}

export class RegisterDto {
  orgName: string;
  email: string;
  password: string;
}

export interface UserWithOrganization {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  patientProfileId?: string | null;
  displayName?: string | null;
  avatarPath?: string | null;
  avatarUpdatedAt?: Date | null;
  isSuspended?: boolean;
  organization: { name: string };
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatResponse {
  role: string;
  content: string;
}

export interface LlmApiResponse {
  choices: Array<{
    message: ChatResponse;
  }>;
}
