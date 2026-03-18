import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationChannelPreference,
  NotificationDelivery,
  NotificationDeliveryStatus,
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../database/prisma.service';
import { NotificationsRealtimeService } from './notifications-realtime.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private realtimeService: NotificationsRealtimeService,
  ) {}

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
      select: {
        familyUserId: true,
        familyUser: {
          select: {
            email: true,
          },
        },
      },
    });

    if (accesses.length === 0) {
      return;
    }

    const familyUserIds = accesses.map((access) => access.familyUserId);
    const preferences =
      await this.prisma.notificationChannelPreference.findMany({
        where: {
          organizationId,
          familyUserId: {
            in: familyUserIds,
          },
        },
      });
    const preferenceMap = new Map(
      preferences.map((preference) => [preference.familyUserId, preference]),
    );

    const now = new Date();
    const createdEvents = await this.prisma.$transaction(async (tx) => {
      const events = [];

      for (const access of accesses) {
        const event = await tx.notificationEvent.create({
          data: {
            organizationId,
            patientId,
            familyUserId: access.familyUserId,
            type,
            payload: payload as object | undefined,
          },
        });
        events.push(event);

        const preference = preferenceMap.get(access.familyUserId) ?? null;
        const channels = this.resolveChannels(preference);

        const deliveries = channels.map((channel) => {
          if (channel === NotificationChannel.IN_APP) {
            return {
              notificationEventId: event.id,
              organizationId,
              familyUserId: access.familyUserId,
              channel,
              status: NotificationDeliveryStatus.SENT,
              attempts: 1,
              nextAttemptAt: null,
              lastAttemptAt: now,
              deliveredAt: now,
              providerResponse: {
                mode: 'realtime',
              } as Prisma.InputJsonValue,
            };
          }

          return {
            notificationEventId: event.id,
            organizationId,
            familyUserId: access.familyUserId,
            channel,
            status: NotificationDeliveryStatus.PENDING,
            attempts: 0,
            nextAttemptAt: now,
          };
        });

        if (deliveries.length > 0) {
          await tx.notificationDelivery.createMany({
            data: deliveries,
          });
        }
      }

      return events;
    });

    for (const event of createdEvents) {
      this.realtimeService.publishCreated(event);
    }

    const autoDispatchEnabled =
      this.configService.get<string>('NOTIFY_AUTO_DISPATCH') !== 'false';

    if (autoDispatchEnabled) {
      void this.processPendingDeliveries(organizationId, 100).catch((error) => {
        this.logger.error(
          `Auto dispatch failed for organization ${organizationId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
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
    const notification = await this.prisma.notificationEvent.findFirst({
      where: {
        id: notificationId,
        organizationId,
        familyUserId,
      },
      select: {
        id: true,
      },
    });

    if (!notification) {
      return { count: 0 };
    }

    await this.prisma.notificationEvent.update({
      where: { id: notification.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.realtimeService.publishRead(
      organizationId,
      familyUserId,
      notification.id,
    );

    return { count: 1 };
  }

  async getFamilyNotificationPreferences(
    organizationId: string,
    familyUserId: string,
  ) {
    const familyUser = await this.prisma.user.findFirst({
      where: {
        id: familyUserId,
        organizationId,
        role: UserRole.FAMILY_MEMBER,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!familyUser) {
      throw new NotFoundException('Family user not found');
    }

    const preference =
      await this.prisma.notificationChannelPreference.findUnique({
        where: {
          organizationId_familyUserId: {
            organizationId,
            familyUserId,
          },
        },
      });

    return this.toResolvedPreference(preference, familyUser.email);
  }

  async updateFamilyNotificationPreferences(
    organizationId: string,
    familyUserId: string,
    input: {
      inAppEnabled?: boolean;
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
      webhookEnabled?: boolean;
      emailAddress?: string;
      phoneNumber?: string;
      pushToken?: string;
      webhookUrl?: string;
    },
  ) {
    const current = await this.getFamilyNotificationPreferences(
      organizationId,
      familyUserId,
    );

    const nextPreference = {
      ...current,
      ...input,
    };

    if (
      !nextPreference.inAppEnabled &&
      !nextPreference.emailEnabled &&
      !nextPreference.smsEnabled &&
      !nextPreference.pushEnabled &&
      !nextPreference.webhookEnabled
    ) {
      throw new BadRequestException(
        'At least one notification channel must be enabled',
      );
    }

    if (nextPreference.emailEnabled && !nextPreference.emailAddress) {
      throw new BadRequestException(
        'emailAddress is required when email channel is enabled',
      );
    }

    if (nextPreference.smsEnabled && !nextPreference.phoneNumber) {
      throw new BadRequestException(
        'phoneNumber is required when SMS channel is enabled',
      );
    }

    if (nextPreference.pushEnabled && !nextPreference.pushToken) {
      throw new BadRequestException(
        'pushToken is required when push channel is enabled',
      );
    }

    if (nextPreference.webhookEnabled) {
      if (!nextPreference.webhookUrl) {
        throw new BadRequestException(
          'webhookUrl is required when webhook channel is enabled',
        );
      }
      if (
        !nextPreference.webhookUrl.startsWith('http://') &&
        !nextPreference.webhookUrl.startsWith('https://')
      ) {
        throw new BadRequestException(
          'webhookUrl must start with http:// or https://',
        );
      }
    }

    return this.prisma.notificationChannelPreference.upsert({
      where: {
        organizationId_familyUserId: {
          organizationId,
          familyUserId,
        },
      },
      update: {
        inAppEnabled: nextPreference.inAppEnabled,
        emailEnabled: nextPreference.emailEnabled,
        smsEnabled: nextPreference.smsEnabled,
        pushEnabled: nextPreference.pushEnabled,
        webhookEnabled: nextPreference.webhookEnabled,
        emailAddress: nextPreference.emailAddress,
        phoneNumber: nextPreference.phoneNumber,
        pushToken: nextPreference.pushToken,
        webhookUrl: nextPreference.webhookUrl,
      },
      create: {
        organizationId,
        familyUserId,
        inAppEnabled: nextPreference.inAppEnabled,
        emailEnabled: nextPreference.emailEnabled,
        smsEnabled: nextPreference.smsEnabled,
        pushEnabled: nextPreference.pushEnabled,
        webhookEnabled: nextPreference.webhookEnabled,
        emailAddress: nextPreference.emailAddress,
        phoneNumber: nextPreference.phoneNumber,
        pushToken: nextPreference.pushToken,
        webhookUrl: nextPreference.webhookUrl,
      },
    });
  }

  streamFamilyNotifications(organizationId: string, familyUserId: string) {
    return this.realtimeService.streamFamilyNotifications(
      organizationId,
      familyUserId,
    );
  }

  async processPendingDeliveries(organizationId: string, limit = 100) {
    const now = new Date();

    const deliveries = await this.prisma.notificationDelivery.findMany({
      where: {
        organizationId,
        status: {
          in: [
            NotificationDeliveryStatus.PENDING,
            NotificationDeliveryStatus.FAILED,
          ],
        },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      include: {
        notificationEvent: true,
        familyUser: {
          select: {
            email: true,
          },
        },
      },
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const delivery of deliveries) {
      const claimResult = await this.prisma.notificationDelivery.updateMany({
        where: {
          id: delivery.id,
          status: {
            in: [
              NotificationDeliveryStatus.PENDING,
              NotificationDeliveryStatus.FAILED,
            ],
          },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
        data: {
          status: NotificationDeliveryStatus.PROCESSING,
          attempts: {
            increment: 1,
          },
          lastAttemptAt: now,
        },
      });

      if (claimResult.count === 0) {
        continue;
      }

      const claimed = await this.prisma.notificationDelivery.findUnique({
        where: { id: delivery.id },
        include: {
          notificationEvent: true,
          familyUser: {
            select: {
              email: true,
            },
          },
        },
      });

      if (!claimed) {
        continue;
      }

      processed += 1;

      const preference = await this.getFamilyNotificationPreferences(
        organizationId,
        claimed.familyUserId,
      );

      const result = await this.dispatchDelivery(claimed, preference);
      if (result === NotificationDeliveryStatus.SENT) {
        sent += 1;
      } else if (result === NotificationDeliveryStatus.SKIPPED) {
        skipped += 1;
      } else {
        failed += 1;
      }
    }

    return {
      processed,
      sent,
      skipped,
      failed,
    };
  }

  async listRecentDeliveries(organizationId: string, limit = 100) {
    return this.prisma.notificationDelivery.findMany({
      where: {
        organizationId,
      },
      include: {
        notificationEvent: true,
        familyUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private resolveChannels(
    preference: NotificationChannelPreference | null,
  ): NotificationChannel[] {
    const channels = new Set<NotificationChannel>();

    if (!preference) {
      channels.add(NotificationChannel.IN_APP);
      return [...channels];
    }

    if (preference.inAppEnabled) {
      channels.add(NotificationChannel.IN_APP);
    }
    if (preference.emailEnabled) {
      channels.add(NotificationChannel.EMAIL);
    }
    if (preference.smsEnabled) {
      channels.add(NotificationChannel.SMS);
    }
    if (preference.pushEnabled) {
      channels.add(NotificationChannel.PUSH);
    }
    if (preference.webhookEnabled) {
      channels.add(NotificationChannel.WEBHOOK);
    }

    if (channels.size === 0) {
      channels.add(NotificationChannel.IN_APP);
    }

    return [...channels];
  }

  private toResolvedPreference(
    preference: NotificationChannelPreference | null,
    fallbackEmail: string,
  ) {
    return {
      inAppEnabled: preference?.inAppEnabled ?? true,
      emailEnabled: preference?.emailEnabled ?? false,
      smsEnabled: preference?.smsEnabled ?? false,
      pushEnabled: preference?.pushEnabled ?? false,
      webhookEnabled: preference?.webhookEnabled ?? false,
      emailAddress: preference?.emailAddress ?? fallbackEmail,
      phoneNumber: preference?.phoneNumber ?? null,
      pushToken: preference?.pushToken ?? null,
      webhookUrl: preference?.webhookUrl ?? null,
    };
  }

  private async dispatchDelivery(
    delivery: NotificationDelivery & {
      notificationEvent: {
        id: string;
        patientId: string;
        type: NotificationType;
        payload: Prisma.JsonValue | null;
        createdAt: Date;
      };
      familyUser: {
        email: string;
      };
    },
    preference: {
      inAppEnabled: boolean;
      emailEnabled: boolean;
      smsEnabled: boolean;
      pushEnabled: boolean;
      webhookEnabled: boolean;
      emailAddress: string | null;
      phoneNumber: string | null;
      pushToken: string | null;
      webhookUrl: string | null;
    },
  ): Promise<NotificationDeliveryStatus> {
    if (delivery.channel === NotificationChannel.IN_APP) {
      await this.markDeliverySent(delivery.id, {
        mode: 'in-app',
      });
      return NotificationDeliveryStatus.SENT;
    }

    try {
      if (delivery.channel === NotificationChannel.EMAIL) {
        const targetEmail =
          preference.emailAddress || delivery.familyUser.email;
        if (!preference.emailEnabled || !targetEmail) {
          await this.markDeliverySkipped(
            delivery.id,
            'Email channel disabled or target email unavailable',
          );
          return NotificationDeliveryStatus.SKIPPED;
        }

        const endpoint = this.configService.get<string>(
          'NOTIFY_EMAIL_WEBHOOK_URL',
        );
        if (!endpoint) {
          await this.markDeliverySkipped(
            delivery.id,
            'Email webhook endpoint is not configured',
          );
          return NotificationDeliveryStatus.SKIPPED;
        }

        const response = await this.sendWebhook(
          endpoint,
          this.configService.get<string>('NOTIFY_EMAIL_WEBHOOK_TOKEN'),
          {
            channel: 'EMAIL',
            to: targetEmail,
            event: {
              id: delivery.notificationEvent.id,
              type: delivery.notificationEvent.type,
              patientId: delivery.notificationEvent.patientId,
              payload: delivery.notificationEvent.payload,
              createdAt: delivery.notificationEvent.createdAt,
            },
          },
        );

        await this.markDeliverySent(delivery.id, response);
        return NotificationDeliveryStatus.SENT;
      }

      if (delivery.channel === NotificationChannel.SMS) {
        if (!preference.smsEnabled || !preference.phoneNumber) {
          await this.markDeliverySkipped(
            delivery.id,
            'SMS channel disabled or phone number unavailable',
          );
          return NotificationDeliveryStatus.SKIPPED;
        }

        const endpoint = this.configService.get<string>(
          'NOTIFY_SMS_WEBHOOK_URL',
        );
        if (!endpoint) {
          await this.markDeliverySkipped(
            delivery.id,
            'SMS webhook endpoint is not configured',
          );
          return NotificationDeliveryStatus.SKIPPED;
        }

        const response = await this.sendWebhook(
          endpoint,
          this.configService.get<string>('NOTIFY_SMS_WEBHOOK_TOKEN'),
          {
            channel: 'SMS',
            to: preference.phoneNumber,
            event: {
              id: delivery.notificationEvent.id,
              type: delivery.notificationEvent.type,
              patientId: delivery.notificationEvent.patientId,
              payload: delivery.notificationEvent.payload,
              createdAt: delivery.notificationEvent.createdAt,
            },
          },
        );

        await this.markDeliverySent(delivery.id, response);
        return NotificationDeliveryStatus.SENT;
      }

      if (delivery.channel === NotificationChannel.PUSH) {
        if (!preference.pushEnabled || !preference.pushToken) {
          await this.markDeliverySkipped(
            delivery.id,
            'Push channel disabled or push token unavailable',
          );
          return NotificationDeliveryStatus.SKIPPED;
        }

        const endpoint = this.configService.get<string>(
          'NOTIFY_PUSH_WEBHOOK_URL',
        );
        if (!endpoint) {
          await this.markDeliverySkipped(
            delivery.id,
            'Push webhook endpoint is not configured',
          );
          return NotificationDeliveryStatus.SKIPPED;
        }

        const response = await this.sendWebhook(
          endpoint,
          this.configService.get<string>('NOTIFY_PUSH_WEBHOOK_TOKEN'),
          {
            channel: 'PUSH',
            to: preference.pushToken,
            event: {
              id: delivery.notificationEvent.id,
              type: delivery.notificationEvent.type,
              patientId: delivery.notificationEvent.patientId,
              payload: delivery.notificationEvent.payload,
              createdAt: delivery.notificationEvent.createdAt,
            },
          },
        );

        await this.markDeliverySent(delivery.id, response);
        return NotificationDeliveryStatus.SENT;
      }

      if (delivery.channel === NotificationChannel.WEBHOOK) {
        if (!preference.webhookEnabled || !preference.webhookUrl) {
          await this.markDeliverySkipped(
            delivery.id,
            'Webhook channel disabled or target webhook unavailable',
          );
          return NotificationDeliveryStatus.SKIPPED;
        }

        const response = await this.sendWebhook(
          preference.webhookUrl,
          this.configService.get<string>('NOTIFY_WEBHOOK_TOKEN'),
          {
            channel: 'WEBHOOK',
            event: {
              id: delivery.notificationEvent.id,
              type: delivery.notificationEvent.type,
              patientId: delivery.notificationEvent.patientId,
              payload: delivery.notificationEvent.payload,
              createdAt: delivery.notificationEvent.createdAt,
            },
          },
        );

        await this.markDeliverySent(delivery.id, response);
        return NotificationDeliveryStatus.SENT;
      }

      await this.markDeliverySkipped(
        delivery.id,
        'Unknown notification channel',
      );
      return NotificationDeliveryStatus.SKIPPED;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.markDeliveryFailed(delivery, message);
      return NotificationDeliveryStatus.FAILED;
    }
  }

  private async sendWebhook(
    endpoint: string,
    token: string | undefined,
    payload: Record<string, unknown>,
  ) {
    const timeoutMs = Number(
      this.configService.get<string>('NOTIFY_WEBHOOK_TIMEOUT_MS') ?? 5000,
    );

    const response = await axios.post(endpoint, payload, {
      timeout: timeoutMs,
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });

    return {
      status: response.status,
      statusText: response.statusText,
    };
  }

  private async markDeliverySent(
    deliveryId: string,
    providerResponse: Record<string, unknown>,
  ) {
    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: NotificationDeliveryStatus.SENT,
        deliveredAt: new Date(),
        nextAttemptAt: null,
        failureReason: null,
        providerResponse: providerResponse as Prisma.InputJsonValue,
      },
    });
  }

  private async markDeliverySkipped(deliveryId: string, reason: string) {
    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: NotificationDeliveryStatus.SKIPPED,
        nextAttemptAt: null,
        failureReason: reason.slice(0, 500),
      },
    });
  }

  private async markDeliveryFailed(
    delivery: NotificationDelivery,
    reason: string,
  ) {
    const maxAttempts = Number(
      this.configService.get<string>('NOTIFY_MAX_ATTEMPTS') ?? 5,
    );

    const attempts = delivery.attempts;
    const hasAttemptsLeft = attempts < maxAttempts;

    const backoffMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
    const nextAttemptAt = hasAttemptsLeft
      ? new Date(Date.now() + backoffMinutes * 60 * 1000)
      : null;

    await this.prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: NotificationDeliveryStatus.FAILED,
        nextAttemptAt,
        failureReason: reason.slice(0, 500),
      },
    });
  }
}
