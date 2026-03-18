import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async emitToPatientFamily(
    organizationId: string,
    patientId: string,
    type: NotificationType,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const accesses = await this.prisma.patientFamilyAccess.findMany({
      where: {
        patientId,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { familyUserId: true },
    });

    if (accesses.length === 0) {
      return;
    }

    await this.prisma.notificationEvent.createMany({
      data: accesses.map((access) => ({
        organizationId,
        patientId,
        familyUserId: access.familyUserId,
        type,
        payload: payload as object | undefined,
      })),
      skipDuplicates: false,
    });
  }

  async listFamilyNotifications(organizationId: string, familyUserId: string) {
    return this.prisma.notificationEvent.findMany({
      where: {
        organizationId,
        familyUserId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markAsRead(
    organizationId: string,
    familyUserId: string,
    notificationId: string,
  ) {
    return this.prisma.notificationEvent.updateMany({
      where: {
        id: notificationId,
        organizationId,
        familyUserId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
