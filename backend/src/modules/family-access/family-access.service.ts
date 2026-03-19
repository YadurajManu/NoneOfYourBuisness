import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import {
  FamilyAccessAction,
  FamilyAccessLevel,
  NotificationType,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Observable } from 'rxjs';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { GrantFamilyAccessDto } from './dto/grant-family-access.dto';
import { RevokeFamilyAccessDto } from './dto/revoke-family-access.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { CreateFamilyQuestionDto } from './dto/create-family-question.dto';
import { AnswerFamilyQuestionDto } from './dto/answer-family-question.dto';
import { CreateFamilyAccessInviteDto } from './dto/create-family-access-invite.dto';
import {
  FamilyInviteDecision,
  RespondFamilyAccessInviteDto,
} from './dto/respond-family-access-invite.dto';

@Injectable()
export class FamilyAccessService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createFamilyMember(orgId: string, dto: CreateFamilyMemberDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      await bcrypt.genSalt(),
    );

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: UserRole.FAMILY_MEMBER,
        organizationId: orgId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });
  }

  async grantAccess(
    orgId: string,
    actorUserId: string,
    patientId: string,
    dto: GrantFamilyAccessDto,
  ) {
    const patient = await this.ensurePatientInOrg(patientId, orgId);
    const familyUser = await this.resolveFamilyUser(orgId, dto);

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Invalid expiresAt date');
    }

    const access = await this.prisma.patientFamilyAccess.upsert({
      where: {
        patientId_familyUserId: {
          patientId: patient.id,
          familyUserId: familyUser.id,
        },
      },
      create: {
        patientId: patient.id,
        familyUserId: familyUser.id,
        grantedByUserId: actorUserId,
        accessLevel: dto.accessLevel,
        consentNote: dto.consentNote,
        expiresAt,
        status: 'ACTIVE',
      },
      update: {
        grantedByUserId: actorUserId,
        accessLevel: dto.accessLevel,
        consentNote: dto.consentNote,
        expiresAt,
        status: 'ACTIVE',
        revokedAt: null,
        grantedAt: new Date(),
      },
      include: {
        familyUser: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    await this.prisma.familyAccessAudit.create({
      data: {
        accessId: access.id,
        actorUserId,
        patientId: patient.id,
        familyUserId: familyUser.id,
        action: FamilyAccessAction.GRANTED,
        note: dto.consentNote,
        metadata: {
          accessLevel: dto.accessLevel,
          expiresAt: dto.expiresAt ?? null,
        },
      },
    });

    await this.notificationsService.emitToPatientFamily(
      orgId,
      patient.id,
      NotificationType.ACCESS_GRANTED,
      {
        patientId: patient.id,
        accessId: access.id,
        accessLevel: access.accessLevel,
      },
    );

    return access;
  }

  async createAccessInvite(
    orgId: string,
    actorUserId: string,
    patientId: string,
    dto: CreateFamilyAccessInviteDto,
  ) {
    const patient = await this.ensurePatientInOrg(patientId, orgId);
    const familyUser = await this.resolveFamilyUser(orgId, dto);
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Invalid expiresAt date');
    }

    await this.prisma.familyAccessInvite.updateMany({
      where: {
        organizationId: orgId,
        patientId: patient.id,
        familyUserId: familyUser.id,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
        respondedByUserId: actorUserId,
        respondedAt: new Date(),
        responseNote: 'Superseded by newer invitation',
      },
    });

    return this.prisma.familyAccessInvite.create({
      data: {
        organizationId: orgId,
        patientId: patient.id,
        familyUserId: familyUser.id,
        invitedByUserId: actorUserId,
        accessLevel: dto.accessLevel,
        consentNote: dto.consentNote,
        expiresAt,
        status: 'PENDING',
      },
      include: {
        familyUser: {
          select: { id: true, email: true, role: true },
        },
        invitedByUser: {
          select: { id: true, email: true, role: true },
        },
      },
    });
  }

  async revokeAccess(
    orgId: string,
    actorUserId: string,
    accessId: string,
    dto: RevokeFamilyAccessDto,
  ) {
    const access = await this.prisma.patientFamilyAccess.findFirst({
      where: {
        id: accessId,
        patient: { organizationId: orgId },
      },
      include: {
        patient: { select: { id: true, organizationId: true } },
      },
    });

    if (!access) {
      throw new NotFoundException('Family access grant not found');
    }

    const updated = await this.prisma.patientFamilyAccess.update({
      where: { id: access.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    await this.prisma.familyAccessAudit.create({
      data: {
        accessId: access.id,
        actorUserId,
        patientId: access.patientId,
        familyUserId: access.familyUserId,
        action: FamilyAccessAction.REVOKED,
        note: dto.note,
      },
    });

    await this.notificationsService.emitToPatientFamily(
      access.patient.organizationId,
      access.patientId,
      NotificationType.ACCESS_REVOKED,
      { patientId: access.patientId, accessId: access.id },
    );

    return updated;
  }

  async listPatientAccessGrants(orgId: string, patientId: string) {
    await this.ensurePatientInOrg(patientId, orgId);

    return this.prisma.patientFamilyAccess.findMany({
      where: { patientId },
      include: {
        familyUser: {
          select: { id: true, email: true, role: true },
        },
        grantedByUser: {
          select: { id: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPatientAccessInvites(orgId: string, patientId: string) {
    await this.ensurePatientInOrg(patientId, orgId);

    return this.prisma.familyAccessInvite.findMany({
      where: { organizationId: orgId, patientId },
      include: {
        familyUser: {
          select: { id: true, email: true, role: true },
        },
        invitedByUser: {
          select: { id: true, email: true, role: true },
        },
        respondedByUser: {
          select: { id: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPendingInvitesForPatient(orgId: string, patientUserId: string) {
    const patientProfileId = await this.resolvePatientProfileIdForUser(
      orgId,
      patientUserId,
    );

    return this.prisma.familyAccessInvite.findMany({
      where: {
        organizationId: orgId,
        patientId: patientProfileId,
        status: 'PENDING',
      },
      include: {
        familyUser: {
          select: { id: true, email: true, role: true },
        },
        invitedByUser: {
          select: { id: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondToInvite(
    orgId: string,
    patientUserId: string,
    inviteId: string,
    dto: RespondFamilyAccessInviteDto,
  ) {
    const patientProfileId = await this.resolvePatientProfileIdForUser(
      orgId,
      patientUserId,
    );

    const invite = await this.prisma.familyAccessInvite.findFirst({
      where: {
        id: inviteId,
        organizationId: orgId,
        patientId: patientProfileId,
      },
      include: {
        familyUser: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Invite is not pending');
    }

    if (dto.decision === FamilyInviteDecision.REJECT) {
      return this.prisma.familyAccessInvite.update({
        where: { id: invite.id },
        data: {
          status: 'REJECTED',
          respondedByUserId: patientUserId,
          respondedAt: new Date(),
          responseNote: dto.note?.trim() || null,
        },
      });
    }

    const approved = await this.prisma.$transaction(async (tx) => {
      const access = await tx.patientFamilyAccess.upsert({
        where: {
          patientId_familyUserId: {
            patientId: invite.patientId,
            familyUserId: invite.familyUserId,
          },
        },
        create: {
          patientId: invite.patientId,
          familyUserId: invite.familyUserId,
          grantedByUserId: patientUserId,
          accessLevel: invite.accessLevel,
          consentNote: invite.consentNote,
          expiresAt: invite.expiresAt,
          status: 'ACTIVE',
        },
        update: {
          grantedByUserId: patientUserId,
          accessLevel: invite.accessLevel,
          consentNote: invite.consentNote,
          expiresAt: invite.expiresAt,
          status: 'ACTIVE',
          revokedAt: null,
          grantedAt: new Date(),
        },
      });

      await tx.familyAccessAudit.create({
        data: {
          accessId: access.id,
          actorUserId: patientUserId,
          patientId: invite.patientId,
          familyUserId: invite.familyUserId,
          action: FamilyAccessAction.GRANTED,
          note: dto.note || invite.consentNote || 'Patient approved invite',
          metadata: {
            fromInviteId: invite.id,
            accessLevel: access.accessLevel,
            expiresAt: access.expiresAt,
          },
        },
      });

      const inviteRow = await tx.familyAccessInvite.update({
        where: { id: invite.id },
        data: {
          status: 'APPROVED',
          respondedByUserId: patientUserId,
          respondedAt: new Date(),
          responseNote: dto.note?.trim() || null,
        },
      });

      return { access, invite: inviteRow };
    });

    await this.notificationsService.emitToPatientFamily(
      orgId,
      invite.patientId,
      NotificationType.ACCESS_GRANTED,
      {
        patientId: invite.patientId,
        accessId: approved.access.id,
        accessLevel: approved.access.accessLevel,
      },
    );

    return approved;
  }

  async listPatientAccessAudit(orgId: string, patientId: string) {
    await this.ensurePatientInOrg(patientId, orgId);
    return this.prisma.familyAccessAudit.findMany({
      where: { patientId },
      include: {
        actor: {
          select: { id: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    });
  }

  async listPatientAuditForPatientUser(orgId: string, patientUserId: string) {
    const patientProfileId = await this.resolvePatientProfileIdForUser(
      orgId,
      patientUserId,
    );
    return this.listPatientAccessAudit(orgId, patientProfileId);
  }

  async listMyPatients(orgId: string, familyUserId: string) {
    return this.prisma.patientFamilyAccess.findMany({
      where: {
        familyUserId,
        status: 'ACTIVE',
        patient: { organizationId: orgId },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        patient: {
          select: {
            id: true,
            lifecycleStage: true,
            updatedAt: true,
            fhirResource: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMyPatientView(
    orgId: string,
    familyUserId: string,
    patientId: string,
  ) {
    const access = await this.prisma.patientFamilyAccess.findFirst({
      where: {
        patientId,
        familyUserId,
        status: 'ACTIVE',
        patient: { organizationId: orgId },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!access) {
      throw new ForbiddenException('No active family access for this patient');
    }

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId: orgId,
      },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            status: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    await this.prisma.familyAccessAudit.create({
      data: {
        accessId: access.id,
        actorUserId: familyUserId,
        patientId: patient.id,
        familyUserId,
        action: FamilyAccessAction.VIEWED_PATIENT,
        metadata: { accessLevel: access.accessLevel },
      },
    });

    return {
      access,
      patient,
    };
  }

  async assertFamilyDocumentAccess(
    orgId: string,
    familyUserId: string,
    patientId: string,
    mode: 'VIEW' | 'UPLOAD',
  ) {
    const access = await this.prisma.patientFamilyAccess.findFirst({
      where: {
        patientId,
        familyUserId,
        status: 'ACTIVE',
        patient: { organizationId: orgId },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        id: true,
        accessLevel: true,
      },
    });

    if (!access) {
      throw new ForbiddenException('No active family access for this patient');
    }

    if (
      mode === 'UPLOAD' &&
      access.accessLevel === FamilyAccessLevel.VIEW_ONLY
    ) {
      throw new ForbiddenException(
        'Current family access level does not allow report uploads',
      );
    }

    return access;
  }

  async listMyNotifications(orgId: string, familyUserId: string) {
    return this.notificationsService.listFamilyNotifications(
      orgId,
      familyUserId,
    );
  }

  async markNotificationRead(
    orgId: string,
    familyUserId: string,
    notificationId: string,
  ) {
    const result = await this.notificationsService.markAsRead(
      orgId,
      familyUserId,
      notificationId,
    );

    if (result.count === 0) {
      throw new NotFoundException('Notification not found');
    }

    return { updated: true };
  }

  async getMyNotificationPreferences(orgId: string, familyUserId: string) {
    return this.notificationsService.getFamilyNotificationPreferences(
      orgId,
      familyUserId,
    );
  }

  async updateMyNotificationPreferences(
    orgId: string,
    familyUserId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updateFamilyNotificationPreferences(
      orgId,
      familyUserId,
      dto,
    );
  }

  streamMyNotifications(
    orgId: string,
    familyUserId: string,
  ): Observable<MessageEvent> {
    return this.notificationsService.streamFamilyNotifications(
      orgId,
      familyUserId,
    );
  }

  async submitFamilyQuestion(
    orgId: string,
    familyUserId: string,
    patientId: string,
    dto: CreateFamilyQuestionDto,
  ) {
    const access = await this.prisma.patientFamilyAccess.findFirst({
      where: {
        patientId,
        familyUserId,
        status: 'ACTIVE',
        patient: { organizationId: orgId },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });

    if (!access) {
      throw new ForbiddenException('No active access to submit question');
    }

    return this.prisma.familyQuestion.create({
      data: {
        organizationId: orgId,
        patientId,
        askedByUserId: familyUserId,
        question: dto.question.trim(),
        context: dto.context?.trim() || null,
      },
    });
  }

  listMyQuestions(orgId: string, familyUserId: string) {
    return this.prisma.familyQuestion.findMany({
      where: {
        organizationId: orgId,
        askedByUserId: familyUserId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            lifecycleStage: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async listPatientQuestions(orgId: string, patientId: string) {
    await this.ensurePatientInOrg(patientId, orgId);
    return this.prisma.familyQuestion.findMany({
      where: {
        organizationId: orgId,
        patientId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        askedByUser: {
          select: {
            id: true,
            email: true,
          },
        },
        answeredByUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async answerFamilyQuestion(
    orgId: string,
    actorUserId: string,
    questionId: string,
    dto: AnswerFamilyQuestionDto,
  ) {
    const question = await this.prisma.familyQuestion.findFirst({
      where: { id: questionId, organizationId: orgId },
      select: { id: true },
    });

    if (!question) {
      throw new NotFoundException('Family question not found');
    }

    return this.prisma.familyQuestion.update({
      where: { id: questionId },
      data: {
        answer: dto.answer.trim(),
        answeredByUserId: actorUserId,
        answeredAt: new Date(),
        status: 'ANSWERED',
      },
    });
  }

  private async ensurePatientInOrg(patientId: string, orgId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
      select: { id: true, organizationId: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  private async resolveFamilyUser(
    orgId: string,
    dto: { familyUserId?: string; familyEmail?: string },
  ) {
    let user = null;

    if (dto.familyUserId) {
      user = await this.prisma.user.findFirst({
        where: {
          id: dto.familyUserId,
          organizationId: orgId,
          role: UserRole.FAMILY_MEMBER,
        },
      });
    } else if (dto.familyEmail) {
      user = await this.prisma.user.findFirst({
        where: {
          email: dto.familyEmail,
          organizationId: orgId,
          role: UserRole.FAMILY_MEMBER,
        },
      });
    }

    if (!user) {
      throw new BadRequestException(
        'Family member account not found in this organization. Create a FAMILY_MEMBER user first, then send invite.',
      );
    }

    return user;
  }

  private async resolvePatientProfileIdForUser(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: orgId,
        role: UserRole.PATIENT,
        isSuspended: false,
      },
      select: {
        patientProfileId: true,
      },
    });

    if (!user?.patientProfileId) {
      throw new ForbiddenException(
        'Patient account is not linked to a patient profile',
      );
    }

    return user.patientProfileId;
  }
}
