import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });
  }

  async create(data: { email: string; passwordHash: string; role: UserRole; organizationId: string }) {
    return this.prisma.user.create({
      data,
    });
  }

  async createWithOrganization(orgName: string, adminEmail: string, passwordHash: string) {
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
