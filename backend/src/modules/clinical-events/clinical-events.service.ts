import {
  AlertPriority,
  AlertStatus,
  ClinicalEventSeverity,
  NotificationType,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateClinicalEventDto } from './dto/create-clinical-event.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';

@Injectable()
export class ClinicalEventsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createEvent(
    orgId: string,
    patientId: string,
    actorUserId: string,
    dto: CreateClinicalEventDto,
  ) {
    await this.ensurePatientInOrganization(patientId, orgId);

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Invalid occurredAt timestamp');
    }

    const event = await this.prisma.clinicalEvent.create({
      data: {
        organizationId: orgId,
        patientId,
        actorUserId,
        type: dto.type,
        severity: dto.severity,
        title: dto.title,
        description: dto.description,
        data: dto.data as object | undefined,
        occurredAt,
      },
    });

    const shouldRaiseAlert =
      dto.raiseAlert || dto.severity === ClinicalEventSeverity.CRITICAL;

    let alert = null;
    if (shouldRaiseAlert) {
      alert = await this.prisma.clinicalAlert.create({
        data: {
          organizationId: orgId,
          patientId,
          clinicalEventId: event.id,
          priority:
            dto.alertPriority ?? this.priorityFromSeverity(dto.severity),
          title: dto.alertTitle ?? `Clinical ${dto.type} Alert`,
          message: dto.alertMessage ?? dto.description ?? dto.title,
        },
      });

      await this.notificationsService.emitToPatientFamily(
        orgId,
        patientId,
        NotificationType.CLINICAL_ALERT_CREATED,
        {
          alertId: alert.id,
          eventId: event.id,
          type: dto.type,
          severity: dto.severity,
          priority: alert.priority,
          title: alert.title,
        },
      );
    } else if (dto.notifyFamily) {
      await this.notificationsService.emitToPatientFamily(
        orgId,
        patientId,
        NotificationType.CLINICAL_EVENT_RECORDED,
        {
          eventId: event.id,
          type: dto.type,
          severity: dto.severity,
          title: dto.title,
        },
      );
    }

    return {
      event,
      alert,
    };
  }

  async listPatientEvents(orgId: string, patientId: string) {
    await this.ensurePatientInOrganization(patientId, orgId);

    return this.prisma.clinicalEvent.findMany({
      where: {
        organizationId: orgId,
        patientId,
      },
      include: {
        alert: true,
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async listOpenAlerts(orgId: string) {
    return this.prisma.clinicalAlert.findMany({
      where: {
        organizationId: orgId,
        status: AlertStatus.OPEN,
      },
      include: {
        clinicalEvent: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async listPatientAlerts(orgId: string, patientId: string) {
    await this.ensurePatientInOrganization(patientId, orgId);

    return this.prisma.clinicalAlert.findMany({
      where: {
        organizationId: orgId,
        patientId,
      },
      include: {
        clinicalEvent: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAlertStatus(
    orgId: string,
    actorUserId: string,
    alertId: string,
    dto: UpdateAlertStatusDto,
  ) {
    const alert = await this.prisma.clinicalAlert.findFirst({
      where: {
        id: alertId,
        organizationId: orgId,
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (dto.status === AlertStatus.ACKNOWLEDGED) {
      if (alert.status === AlertStatus.RESOLVED) {
        throw new BadRequestException('Resolved alerts cannot be acknowledged');
      }

      return this.prisma.clinicalAlert.update({
        where: { id: alert.id },
        data: {
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedByUserId: actorUserId,
          acknowledgedAt: new Date(),
        },
      });
    }

    if (dto.status === AlertStatus.RESOLVED) {
      return this.prisma.clinicalAlert.update({
        where: { id: alert.id },
        data: {
          status: AlertStatus.RESOLVED,
          resolvedByUserId: actorUserId,
          resolvedAt: new Date(),
          acknowledgedByUserId: alert.acknowledgedByUserId ?? actorUserId,
          acknowledgedAt: alert.acknowledgedAt ?? new Date(),
        },
      });
    }

    return this.prisma.clinicalAlert.update({
      where: { id: alert.id },
      data: {
        status: AlertStatus.OPEN,
        acknowledgedByUserId: null,
        acknowledgedAt: null,
        resolvedByUserId: null,
        resolvedAt: null,
      },
    });
  }

  private async ensurePatientInOrganization(
    patientId: string,
    orgId: string,
  ): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId: orgId,
      },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
  }

  private priorityFromSeverity(severity: ClinicalEventSeverity): AlertPriority {
    switch (severity) {
      case ClinicalEventSeverity.CRITICAL:
        return AlertPriority.CRITICAL;
      case ClinicalEventSeverity.WARNING:
        return AlertPriority.HIGH;
      default:
        return AlertPriority.MEDIUM;
    }
  }
}
