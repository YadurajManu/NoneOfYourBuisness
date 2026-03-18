import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { organization: true, patientProfile: true },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { organization: true, patientProfile: true },
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    role: UserRole;
    organizationId: string;
    patientProfileId?: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  async listByOrganization(orgId: string) {
    return this.prisma.user.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        isSuspended: true,
        suspendedAt: true,
        createdAt: true,
        updatedAt: true,
        patientProfileId: true,
      },
    });
  }

  async listActiveSpecialistsByOrganization(orgId: string) {
    return this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: UserRole.SPECIALIST,
        isSuspended: false,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async listActiveDoctorsByOrganization(orgId: string) {
    return this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: UserRole.DOCTOR,
        isSuspended: false,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateRole(userId: string, orgId: string, role: UserRole) {
    return this.prisma.user.updateMany({
      where: {
        id: userId,
        organizationId: orgId,
      },
      data: { role },
    });
  }

  async setSuspended(userId: string, orgId: string, suspended: boolean) {
    return this.prisma.user.updateMany({
      where: {
        id: userId,
        organizationId: orgId,
      },
      data: {
        isSuspended: suspended,
        suspendedAt: suspended ? new Date() : null,
      },
    });
  }

  async createWithOrganization(
    orgName: string,
    adminEmail: string,
    passwordHash: string,
  ) {
    return this.prisma.organization.create({
      data: {
        name: orgName,
        users: {
          create: {
            email: adminEmail,
            passwordHash,
            role: UserRole.ADMIN,
          },
        },
      },
      include: {
        users: true,
      },
    });
  }
}
