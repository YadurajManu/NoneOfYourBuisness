import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import { FamilyAccessAction, NotificationType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Observable } from 'rxjs';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { GrantFamilyAccessDto } from './dto/grant-family-access.dto';
import { RevokeFamilyAccessDto } from './dto/revoke-family-access.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

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

  private async resolveFamilyUser(orgId: string, dto: GrantFamilyAccessDto) {
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
      throw new NotFoundException(
        'Family member account not found in this organization',
      );
    }

    return user;
  }
}
