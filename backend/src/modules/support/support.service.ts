import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

const TRIAGE_ROLES = new Set<string>([
  UserRole.ADMIN,
  UserRole.CARE_COORDINATOR,
]);

const STAFF_ASSIGNABLE_ROLES = [
  UserRole.ADMIN,
  UserRole.CARE_COORDINATOR,
  UserRole.DOCTOR,
  UserRole.SPECIALIST,
];

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async listTickets(user: AuthenticatedUser) {
    const actor = await this.resolveActor(user);
    return this.prisma.supportTicket.findMany({
      where: this.ticketAccessWhere(actor),
      include: this.ticketInclude(),
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 100,
    });
  }

  async getTicket(user: AuthenticatedUser, ticketId: string) {
    const actor = await this.resolveActor(user);
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, ...this.ticketAccessWhere(actor) },
      include: {
        ...this.ticketInclude(),
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
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  async createTicket(user: AuthenticatedUser, dto: CreateSupportTicketDto) {
    const actor = await this.resolveActor(user);
    await this.assertPatientInOrganization(actor.organizationId, dto.patientId);

    const assignedToUserId = dto.assignedToUserId
      ? await this.resolveAssignee(actor.organizationId, dto.assignedToUserId)
      : await this.defaultAssignee(actor.organizationId);

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          organizationId: actor.organizationId,
          createdByUserId: actor.id,
          assignedToUserId,
          patientId: dto.patientId || undefined,
          category: dto.category,
          priority: dto.priority || SupportTicketPriority.NORMAL,
          subject: dto.subject.trim(),
          messages: {
            create: {
              senderUserId: actor.id,
              body: dto.body.trim(),
            },
          },
        },
        select: { id: true },
      });

      return created;
    });

    return this.getTicket(user, ticket.id);
  }

  async addMessage(
    user: AuthenticatedUser,
    ticketId: string,
    dto: CreateSupportMessageDto,
  ) {
    const actor = await this.resolveActor(user);
    const ticket = await this.assertTicketAccessible(actor, ticketId);

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException('Closed support tickets cannot be updated');
    }

    await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderUserId: actor.id,
        body: dto.body.trim(),
      },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: TRIAGE_ROLES.has(actor.role)
          ? ticket.status
          : SupportTicketStatus.OPEN,
      },
    });

    return this.getTicket(user, ticketId);
  }

  async updateTicket(
    user: AuthenticatedUser,
    ticketId: string,
    dto: UpdateSupportTicketDto,
  ) {
    const actor = await this.resolveActor(user);
    if (!TRIAGE_ROLES.has(actor.role)) {
      throw new ForbiddenException('Only support triage can update tickets');
    }

    await this.assertTicketAccessible(actor, ticketId);

    const assignedToUserId =
      dto.assignedToUserId === null || dto.assignedToUserId === undefined
        ? dto.assignedToUserId
        : await this.resolveAssignee(
            actor.organizationId,
            dto.assignedToUserId,
          );

    const status = dto.status;
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        ...(status ? { status } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(assignedToUserId !== undefined ? { assignedToUserId } : {}),
        ...(status === SupportTicketStatus.CLOSED ||
        status === SupportTicketStatus.RESOLVED
          ? { closedAt: new Date() }
          : status
            ? { closedAt: null }
            : {}),
      },
    });

    return this.getTicket(user, ticketId);
  }

  async listAssignees(user: AuthenticatedUser) {
    const actor = await this.resolveActor(user);
    if (
      !TRIAGE_ROLES.has(actor.role) &&
      actor.role !== UserRole.DOCTOR &&
      actor.role !== UserRole.SPECIALIST
    ) {
      return [];
    }

    return this.prisma.user.findMany({
      where: {
        organizationId: actor.organizationId,
        isSuspended: false,
        role: { in: STAFF_ASSIGNABLE_ROLES },
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
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
      },
    });

    if (!actor) {
      throw new ForbiddenException('Active user account required');
    }

    return actor;
  }

  private ticketAccessWhere(actor: {
    id: string;
    role: string;
    organizationId: string;
  }) {
    if (TRIAGE_ROLES.has(actor.role)) {
      return { organizationId: actor.organizationId };
    }

    return {
      organizationId: actor.organizationId,
      OR: [{ createdByUserId: actor.id }, { assignedToUserId: actor.id }],
    };
  }

  private async assertTicketAccessible(
    actor: { id: string; role: string; organizationId: string },
    ticketId: string,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, ...this.ticketAccessWhere(actor) },
      select: {
        id: true,
        status: true,
        organizationId: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  private async assertPatientInOrganization(
    organizationId: string,
    patientId?: string,
  ) {
    if (!patientId) return;

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
      select: { id: true },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found in organization');
    }
  }

  private async resolveAssignee(organizationId: string, userId: string) {
    const assignee = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        isSuspended: false,
        role: { in: STAFF_ASSIGNABLE_ROLES },
      },
      select: { id: true },
    });

    if (!assignee) {
      throw new BadRequestException('Assignee is not active support staff');
    }

    return assignee.id;
  }

  private async defaultAssignee(organizationId: string) {
    const coordinator = await this.prisma.user.findFirst({
      where: {
        organizationId,
        isSuspended: false,
        role: UserRole.CARE_COORDINATOR,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (coordinator) return coordinator.id;

    const admin = await this.prisma.user.findFirst({
      where: {
        organizationId,
        isSuspended: false,
        role: UserRole.ADMIN,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    return admin?.id;
  }

  private ticketInclude() {
    return {
      createdByUser: {
        select: {
          id: true,
          email: true,
          role: true,
          displayName: true,
        },
      },
      assignedToUser: {
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
          fhirResource: true,
          lifecycleStage: true,
        },
      },
      _count: {
        select: { messages: true },
      },
    };
  }
}
