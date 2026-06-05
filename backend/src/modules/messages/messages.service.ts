import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DirectMessagePriority,
  FamilyAccessStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';

const STAFF_ROLES = new Set<string>([
  UserRole.ADMIN,
  UserRole.CARE_COORDINATOR,
  UserRole.DOCTOR,
  UserRole.SPECIALIST,
]);

const ALWAYS_REACHABLE_ROLES = new Set<string>([
  UserRole.ADMIN,
  UserRole.CARE_COORDINATOR,
]);

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async searchUsers(user: AuthenticatedUser, search = '') {
    const actor = await this.resolveActor(user);
    const trimmed = search.trim();
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: actor.organizationId,
        isSuspended: false,
        id: { not: actor.id },
        ...(trimmed
          ? {
              OR: [
                { email: { contains: trimmed, mode: 'insensitive' } },
                { displayName: { contains: trimmed, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
      take: 30,
    });

    return users.filter((target) => this.canMessage(actor.role, target.role));
  }

  async listConversations(user: AuthenticatedUser) {
    const actor = await this.resolveActor(user);
    return this.prisma.directConversation.findMany({
      where: {
        organizationId: actor.organizationId,
        participants: { some: { userId: actor.id } },
      },
      include: this.conversationInclude(),
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async listContextPatients(user: AuthenticatedUser, search = '') {
    const actor = await this.resolveActor(user);
    const trimmed = search.trim();

    const roleWhere =
      actor.role === UserRole.PATIENT
        ? { id: actor.patientProfileId || '__missing_patient_profile__' }
        : actor.role === UserRole.FAMILY_MEMBER
          ? {
              familyAccesses: {
                some: {
                  familyUserId: actor.id,
                  status: FamilyAccessStatus.ACTIVE,
                },
              },
            }
          : {};

    return this.prisma.patient.findMany({
      where: {
        organizationId: actor.organizationId,
        ...roleWhere,
        ...(trimmed
          ? {
              OR: [
                {
                  fhirResource: {
                    path: ['name', '0', 'text'],
                    string_contains: trimmed,
                  },
                },
                {
                  fhirResource: {
                    path: ['identifier', '0', 'value'],
                    string_contains: trimmed,
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        lifecycleStage: true,
        fhirResource: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async listContextDocuments(user: AuthenticatedUser, patientId: string) {
    const actor = await this.resolveActor(user);
    await this.assertCanAccessPatient(actor, patientId);

    return this.prisma.document.findMany({
      where: {
        patientId,
        patient: { organizationId: actor.organizationId },
      },
      select: {
        id: true,
        type: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async getConversation(user: AuthenticatedUser, conversationId: string) {
    const actor = await this.resolveActor(user);
    const conversation = await this.prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        organizationId: actor.organizationId,
        participants: { some: { userId: actor.id } },
      },
      include: {
        ...this.conversationInclude(),
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                role: true,
                displayName: true,
              },
            },
            patient: {
              select: {
                id: true,
                lifecycleStage: true,
                fhirResource: true,
              },
            },
            document: {
              select: {
                id: true,
                patientId: true,
                type: true,
                status: true,
                metadata: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async createConversation(
    user: AuthenticatedUser,
    dto: CreateDirectConversationDto,
  ) {
    const actor = await this.resolveActor(user);
    const recipient = await this.resolveRecipient(
      actor.organizationId,
      dto.recipientUserId,
    );

    if (!this.canMessage(actor.role, recipient.role)) {
      throw new ForbiddenException('Messaging this user is not allowed');
    }

    const existing = await this.findOneToOneConversation(
      actor.organizationId,
      actor.id,
      recipient.id,
    );

    const conversationId =
      existing?.id ||
      (
        await this.prisma.directConversation.create({
          data: {
            organizationId: actor.organizationId,
            participants: {
              create: [{ userId: actor.id }, { userId: recipient.id }],
            },
          },
          select: { id: true },
        })
      ).id;

    if (dto.initialMessage?.trim()) {
      await this.addMessage(user, conversationId, {
        body: dto.initialMessage.trim(),
        patientId: dto.patientId,
        documentId: dto.documentId,
        priority: dto.priority,
      });
    } else {
      await this.markRead(user, conversationId);
    }

    return this.getConversation(user, conversationId);
  }

  async addMessage(
    user: AuthenticatedUser,
    conversationId: string,
    dto: CreateDirectMessageDto,
  ) {
    const actor = await this.resolveActor(user);
    await this.assertParticipant(actor, conversationId);

    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Message body is required');
    }
    const context = await this.resolveMessageContext(actor, dto);

    await this.prisma.$transaction([
      this.prisma.directMessage.create({
        data: {
          conversationId,
          senderUserId: actor.id,
          patientId: context.patientId,
          documentId: context.documentId,
          priority: dto.priority ?? DirectMessagePriority.NORMAL,
          body,
        },
      }),
      this.prisma.directConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
      this.prisma.directConversationParticipant.updateMany({
        where: { conversationId, userId: actor.id },
        data: { lastReadAt: new Date() },
      }),
    ]);

    return this.getConversation(user, conversationId);
  }

  async markRead(user: AuthenticatedUser, conversationId: string) {
    const actor = await this.resolveActor(user);
    await this.assertParticipant(actor, conversationId);

    await this.prisma.directConversationParticipant.updateMany({
      where: { conversationId, userId: actor.id },
      data: { lastReadAt: new Date() },
    });

    return { success: true };
  }

  private async resolveActor(user: AuthenticatedUser) {
    const actor = await this.prisma.user.findFirst({
      where: {
        id: user.userId,
        organizationId: user.orgId,
        isSuspended: false,
      },
      select: {
        id: true,
        role: true,
        organizationId: true,
        patientProfileId: true,
      },
    });

    if (!actor) {
      throw new ForbiddenException('Active user account required');
    }

    return actor;
  }

  private async resolveMessageContext(
    actor: {
      id: string;
      role: UserRole;
      organizationId: string;
      patientProfileId: string | null;
    },
    dto: CreateDirectMessageDto,
  ) {
    if (dto.documentId && !dto.patientId) {
      throw new BadRequestException(
        'Patient context is required for a document link',
      );
    }

    if (!dto.patientId) {
      return { patientId: undefined, documentId: undefined };
    }

    await this.assertCanAccessPatient(actor, dto.patientId);

    if (!dto.documentId) {
      return { patientId: dto.patientId, documentId: undefined };
    }

    const document = await this.prisma.document.findFirst({
      where: {
        id: dto.documentId,
        patientId: dto.patientId,
        patient: { organizationId: actor.organizationId },
      },
      select: { id: true },
    });

    if (!document) {
      throw new NotFoundException('Linked document not found for this patient');
    }

    return { patientId: dto.patientId, documentId: dto.documentId };
  }

  private async assertCanAccessPatient(
    actor: {
      id: string;
      role: UserRole;
      organizationId: string;
      patientProfileId: string | null;
    },
    patientId: string,
  ) {
    if (STAFF_ROLES.has(actor.role)) {
      const patient = await this.prisma.patient.findFirst({
        where: { id: patientId, organizationId: actor.organizationId },
        select: { id: true },
      });
      if (!patient) {
        throw new NotFoundException('Linked patient not found');
      }
      return;
    }

    if (actor.role === UserRole.PATIENT) {
      if (actor.patientProfileId !== patientId) {
        throw new ForbiddenException('Patient context is not accessible');
      }
      return;
    }

    if (actor.role === UserRole.FAMILY_MEMBER) {
      const access = await this.prisma.patientFamilyAccess.findFirst({
        where: {
          patientId,
          familyUserId: actor.id,
          status: FamilyAccessStatus.ACTIVE,
          patient: { organizationId: actor.organizationId },
        },
        select: { id: true },
      });
      if (!access) {
        throw new ForbiddenException('Patient context is not accessible');
      }
      return;
    }

    throw new ForbiddenException('Patient context is not accessible');
  }

  private async resolveRecipient(organizationId: string, recipientUserId: string) {
    const recipient = await this.prisma.user.findFirst({
      where: {
        id: recipientUserId,
        organizationId,
        isSuspended: false,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    return recipient;
  }

  private canMessage(actorRole: string, targetRole: string) {
    if (ALWAYS_REACHABLE_ROLES.has(targetRole)) return true;
    if (STAFF_ROLES.has(actorRole) && STAFF_ROLES.has(targetRole)) return true;
    if (STAFF_ROLES.has(actorRole) && targetRole === UserRole.PATIENT) {
      return true;
    }
    if (STAFF_ROLES.has(actorRole) && targetRole === UserRole.FAMILY_MEMBER) {
      return true;
    }
    return false;
  }

  private async findOneToOneConversation(
    organizationId: string,
    firstUserId: string,
    secondUserId: string,
  ) {
    const candidates = await this.prisma.directConversation.findMany({
      where: {
        organizationId,
        participants: {
          every: { userId: { in: [firstUserId, secondUserId] } },
          some: { userId: firstUserId },
        },
      },
      include: { participants: { select: { userId: true } } },
      take: 20,
    });

    return candidates.find(
      (conversation) =>
        conversation.participants.length === 2 &&
        conversation.participants.some((row) => row.userId === secondUserId),
    );
  }

  private async assertParticipant(
    actor: { id: string; organizationId: string },
    conversationId: string,
  ) {
    const participant = await this.prisma.directConversationParticipant.findFirst({
      where: {
        conversationId,
        userId: actor.id,
        conversation: { organizationId: actor.organizationId },
      },
      select: { id: true },
    });

    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }
  }

  private conversationInclude() {
    return {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              displayName: true,
              avatarPath: true,
              avatarUpdatedAt: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              role: true,
              displayName: true,
            },
          },
          patient: {
            select: {
              id: true,
              lifecycleStage: true,
              fhirResource: true,
            },
          },
          document: {
            select: {
              id: true,
              patientId: true,
              type: true,
              status: true,
              metadata: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
      _count: {
        select: { messages: true },
      },
    };
  }
}
