import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiMessageRole, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedUser, ChatMessage } from '../../types/jwt.types';
import { AIService, type AssistantRole } from './ai.service';
import { PatientContextService } from './patient-context.service';

const CLINICAL_ROLES = new Set([
  'ADMIN',
  'CARE_COORDINATOR',
  'DOCTOR',
  'SPECIALIST',
]);

const HISTORY_LIMIT = 20;

export interface StreamConverseArgs {
  user: AuthenticatedUser;
  patientId?: string | null;
  conversationId?: string | null;
  message: string;
  onToken: (token: string) => void;
}

export interface StreamConverseResult {
  conversationId: string;
  patientId: string | null;
  content: string;
}

@Injectable()
export class AiConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly patientContext: PatientContextService,
  ) {}

  /**
   * Verify the user is allowed to ground the assistant on this patient.
   * Returns the resolved patient display name.
   */
  private async assertPatientAccess(
    user: AuthenticatedUser,
    patientId: string,
  ): Promise<void> {
    if (CLINICAL_ROLES.has(user.role)) {
      const patient = await this.prisma.patient.findFirst({
        where: { id: patientId, organizationId: user.orgId },
        select: { id: true },
      });
      if (!patient) {
        throw new NotFoundException('Patient not found');
      }
      return;
    }

    if (user.role === 'PATIENT') {
      const account = await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { patientProfileId: true },
      });
      if (
        !account?.patientProfileId ||
        account.patientProfileId !== patientId
      ) {
        throw new ForbiddenException('You can only ask about your own record');
      }
      return;
    }

    if (user.role === 'FAMILY_MEMBER') {
      const access = await this.prisma.patientFamilyAccess.findFirst({
        where: {
          patientId,
          familyUserId: user.userId,
          status: 'ACTIVE',
          patient: { organizationId: user.orgId },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true },
      });
      if (!access) {
        throw new ForbiddenException(
          'No active family access for this patient',
        );
      }
      return;
    }

    throw new ForbiddenException('Role not permitted to use the assistant');
  }

  private deriveTitle(message: string, patientName?: string | null): string {
    const trimmed = message.trim().replace(/\s+/g, ' ');
    const snippet = trimmed.slice(0, 60);
    if (patientName) {
      return `${patientName}: ${snippet}${trimmed.length > 60 ? '…' : ''}`;
    }
    return snippet + (trimmed.length > 60 ? '…' : '');
  }

  async streamConverse(
    args: StreamConverseArgs,
  ): Promise<StreamConverseResult> {
    const { user, message, onToken } = args;
    const role = user.role as AssistantRole;
    const patientId = args.patientId?.trim() || null;

    if (patientId) {
      await this.assertPatientAccess(user, patientId);
    }

    // Resolve or create the conversation, verifying ownership.
    let conversationId = args.conversationId?.trim() || null;
    if (conversationId) {
      const existing = await this.prisma.aiConversation.findFirst({
        where: { id: conversationId, userId: user.userId },
        select: { id: true, patientId: true },
      });
      if (!existing) {
        throw new NotFoundException('Conversation not found');
      }
      // Prevent grounding drift across patients within one thread.
      if (patientId && existing.patientId && existing.patientId !== patientId) {
        throw new ForbiddenException(
          'Conversation belongs to a different patient',
        );
      }
    }

    // Build patient context (if any) up front so we can title the thread.
    let contextText: string | null = null;
    let patientName: string | null = null;
    if (patientId) {
      const context = await this.patientContext.build(user.orgId, patientId);
      patientName = context.displayName;
      contextText = this.patientContext.render(context);
    }

    if (!conversationId) {
      const created = await this.prisma.aiConversation.create({
        data: {
          organizationId: user.orgId,
          userId: user.userId,
          patientId,
          authorRole: user.role as UserRole,
          title: this.deriveTitle(message, patientName),
        },
        select: { id: true },
      });
      conversationId = created.id;
    }

    // Persist the user's message first so history stays consistent on retries.
    await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: AiMessageRole.USER,
        content: message,
      },
    });

    // Assemble the LLM message list: system prompt + recent history.
    const history = await this.prisma.aiMessage.findMany({
      where: {
        conversationId,
        role: { in: [AiMessageRole.USER, AiMessageRole.ASSISTANT] },
      },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
      select: { role: true, content: true },
    });
    history.reverse();

    const systemPrompt = this.aiService.buildSystemPrompt(
      role,
      contextText,
      patientName,
    );

    const llmMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: m.role === AiMessageRole.ASSISTANT ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    const content = await this.aiService.streamChat(llmMessages, onToken);

    await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: AiMessageRole.ASSISTANT,
        content,
      },
    });
    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return { conversationId, patientId, content };
  }

  async listConversations(user: AuthenticatedUser, patientId?: string) {
    return this.prisma.aiConversation.findMany({
      where: {
        userId: user.userId,
        organizationId: user.orgId,
        ...(patientId ? { patientId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        patientId: true,
        updatedAt: true,
        createdAt: true,
      },
    });
  }

  async getConversation(user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, userId: user.userId },
      select: {
        id: true,
        title: true,
        patientId: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          where: {
            role: { in: [AiMessageRole.USER, AiMessageRole.ASSISTANT] },
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }
}
