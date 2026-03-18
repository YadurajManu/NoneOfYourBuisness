import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.patient.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    return this.prisma.patient.findFirst({
      where: { id, organizationId: orgId },
      include: { documents: true },
    });
  }

  async create(orgId: string, fhirResource: Record<string, unknown>) {
    return this.prisma.patient.create({
      data: {
        organizationId: orgId,
        fhirResource: fhirResource as object,
        lifecycleStage: 1, // Start at stage 1: Referral/Intake
      },
    });
  }

  async updateStage(id: string, orgId: string, stage: number) {
    return this.prisma.patient.update({
      where: { id, organizationId: orgId },
      data: { lifecycleStage: stage },
    });
  }
}
