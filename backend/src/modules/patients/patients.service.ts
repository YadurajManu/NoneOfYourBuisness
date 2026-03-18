import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LifecycleOrchestrationService } from './lifecycle-orchestration.service';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private lifecycleOrchestrationService: LifecycleOrchestrationService,
  ) {}

  async findAll(orgId: string) {
    return this.prisma.patient.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, organizationId: orgId },
      include: { documents: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return patient;
  }

  async create(
    orgId: string,
    actorUserId: string,
    fhirResource: Record<string, unknown>,
  ) {
    if (fhirResource.resourceType !== 'Patient') {
      throw new BadRequestException(
        'FHIR resourceType must be "Patient" for this endpoint',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          organizationId: orgId,
          fhirResource: fhirResource as object,
          lifecycleStage: 1, // Start at stage 1: Referral/Intake
        },
      });

      await tx.patientLifecycleTransition.create({
        data: {
          organizationId: orgId,
          patientId: patient.id,
          actorUserId,
          fromStage: 0,
          toStage: 1,
          reason: 'Patient record created',
        },
      });

      return patient;
    });
  }

  async updateStage(
    id: string,
    orgId: string,
    actorUserId: string,
    stage: number,
    options?: {
      reason?: string;
      metadata?: Record<string, unknown>;
      skipAutomations?: boolean;
    },
  ) {
    const currentPatient = await this.findOne(id, orgId);

    const updatedPatient =
      await this.lifecycleOrchestrationService.transitionPatientStage(
        orgId,
        id,
        actorUserId,
        stage,
        {
          reason: options?.reason,
          metadata: options?.metadata,
          skipAutomations: options?.skipAutomations,
        },
      );

    await this.notificationsService.emitToPatientFamily(
      orgId,
      id,
      NotificationType.LIFECYCLE_STAGE_CHANGED,
      {
        fromStage: currentPatient.lifecycleStage,
        toStage: stage,
        reason: options?.reason,
      },
    );

    return updatedPatient;
  }

  async getLifecycleStatus(id: string, orgId: string) {
    return this.lifecycleOrchestrationService.getLifecycleStatus(orgId, id);
  }

  async listLifecycleTransitions(id: string, orgId: string) {
    return this.lifecycleOrchestrationService.listLifecycleTransitions(
      orgId,
      id,
    );
  }
}
