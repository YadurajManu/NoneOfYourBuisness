import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
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

  async create(orgId: string, fhirResource: Record<string, unknown>) {
    if (fhirResource.resourceType !== 'Patient') {
      throw new BadRequestException(
        'FHIR resourceType must be "Patient" for this endpoint',
      );
    }

    return this.prisma.patient.create({
      data: {
        organizationId: orgId,
        fhirResource: fhirResource as object,
        lifecycleStage: 1, // Start at stage 1: Referral/Intake
      },
    });
  }

  async updateStage(id: string, orgId: string, stage: number) {
    await this.findOne(id, orgId);

    const updatedPatient = await this.prisma.patient.update({
      where: { id },
      data: { lifecycleStage: stage },
    });

    await this.notificationsService.emitToPatientFamily(
      orgId,
      id,
      NotificationType.LIFECYCLE_STAGE_CHANGED,
      { stage },
    );

    return updatedPatient;
  }
}
