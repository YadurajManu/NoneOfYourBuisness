import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async listUsers(actorUserId: string) {
    const { organizationId } = await this.resolveAdminContext(actorUserId);
    return this.usersService.listByOrganization(organizationId);
  }

  async createUser(actorUserId: string, dto: CreateAdminUserDto) {
    const { organizationId: orgId } =
      await this.resolveAdminContext(actorUserId);
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      await bcrypt.genSalt(),
    );

    if (dto.role === UserRole.PATIENT) {
      return this.createPatientUser(orgId, dto, passwordHash);
    }

    const user = await this.usersService.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      role: dto.role,
      organizationId: orgId,
      ...(dto.displayName?.trim()
        ? { displayName: dto.displayName.trim() }
        : {}),
    });

    return this.toUserView(user.id);
  }

  async updateUserRole(actorUserId: string, userId: string, role: UserRole) {
    const { organizationId: orgId } =
      await this.resolveAdminContext(actorUserId);
    const result = await this.usersService.updateRole(userId, orgId, role);
    if (result.count === 0) {
      throw new NotFoundException('User not found');
    }

    return this.toUserView(userId);
  }

  async setUserSuspension(
    actorUserId: string,
    userId: string,
    suspended: boolean,
  ) {
    const { organizationId: orgId } =
      await this.resolveAdminContext(actorUserId);
    const result = await this.usersService.setSuspended(
      userId,
      orgId,
      suspended,
    );
    if (result.count === 0) {
      throw new NotFoundException('User not found');
    }

    return this.toUserView(userId);
  }

  async listAuditEvents(actorUserId: string) {
    const { organizationId: orgId } =
      await this.resolveAdminContext(actorUserId);
    const [familyAccessAudits, workflowAudits, lifecycleTransitions] =
      await Promise.all([
        this.prisma.familyAccessAudit.findMany({
          where: { patient: { organizationId: orgId } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        this.prisma.workflowAudit.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        this.prisma.patientLifecycleTransition.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      ]);

    return {
      familyAccessAudits,
      workflowAudits,
      lifecycleTransitions,
    };
  }

  private async resolveAdminContext(actorUserId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: {
        id: true,
        role: true,
        isSuspended: true,
        organizationId: true,
      },
    });

    if (!actor || actor.role !== UserRole.ADMIN || actor.isSuspended) {
      throw new ForbiddenException('Admin account is not active');
    }

    return actor;
  }

  private async createPatientUser(
    orgId: string,
    dto: CreateAdminUserDto,
    passwordHash: string,
  ) {
    if (dto.patientProfileId) {
      const patient = await this.prisma.patient.findFirst({
        where: {
          id: dto.patientProfileId,
          organizationId: orgId,
        },
        select: { id: true },
      });

      if (!patient) {
        throw new NotFoundException(
          'Patient profile not found in organization',
        );
      }
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const patientProfileId =
        dto.patientProfileId ||
        (
          await tx.patient.create({
            data: {
              organizationId: orgId,
              fhirResource: {
                resourceType: 'Patient',
                active: true,
                name: [
                  {
                    text: dto.patientName || dto.email,
                  },
                ],
                telecom: [
                  {
                    system: 'email',
                    value: dto.email.toLowerCase().trim(),
                  },
                ],
              },
            },
            select: { id: true },
          })
        ).id;

      return tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          role: UserRole.PATIENT,
          organizationId: orgId,
          patientProfileId,
          displayName:
            dto.displayName?.trim() || dto.patientName?.trim() || undefined,
        },
        select: { id: true },
      });
    });

    return this.toUserView(user.id);
  }

  private async toUserView(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        avatarPath: true,
        avatarUpdatedAt: true,
        isSuspended: true,
        suspendedAt: true,
        patientProfileId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.usersService.toPortalDirectoryUser(user);
  }
}
