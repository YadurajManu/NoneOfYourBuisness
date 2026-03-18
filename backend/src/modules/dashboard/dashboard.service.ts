import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(orgId: string) {
    const [
      totalPatients,
      totalDocuments,
      totalClinicalEvents,
      openClinicalAlerts,
      lifecycleGrouping,
      documentStatuses,
      alertStatuses,
    ] = await Promise.all([
      this.prisma.patient.count({
        where: { organizationId: orgId },
      }),
      this.prisma.document.count({
        where: {
          patient: {
            organizationId: orgId,
          },
        },
      }),
      this.prisma.clinicalEvent.count({
        where: { organizationId: orgId },
      }),
      this.prisma.clinicalAlert.count({
        where: {
          organizationId: orgId,
          status: AlertStatus.OPEN,
        },
      }),
      this.prisma.patient.groupBy({
        by: ['lifecycleStage'],
        where: { organizationId: orgId },
        _count: {
          lifecycleStage: true,
        },
      }),
      this.prisma.document.groupBy({
        by: ['status'],
        where: {
          patient: {
            organizationId: orgId,
          },
        },
        _count: {
          status: true,
        },
      }),
      this.prisma.clinicalAlert.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: {
          status: true,
        },
      }),
    ]);

    const recentPatients = await this.prisma.patient.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        lifecycleStage: true,
        createdAt: true,
        updatedAt: true,
        fhirResource: true,
      },
    });

    const lifecycleBreakdown = lifecycleGrouping
      .sort((a, b) => a.lifecycleStage - b.lifecycleStage)
      .map((entry) => ({
        stage: entry.lifecycleStage,
        count: entry._count.lifecycleStage,
      }));

    const documentStatusBreakdown = documentStatuses.map((entry) => ({
      status: entry.status,
      count: entry._count.status,
    }));
    const alertStatusBreakdown = alertStatuses.map((entry) => ({
      status: entry.status,
      count: entry._count.status,
    }));

    return {
      totals: {
        patients: totalPatients,
        documents: totalDocuments,
        clinicalEvents: totalClinicalEvents,
        openClinicalAlerts,
      },
      lifecycleBreakdown,
      documentStatusBreakdown,
      alertStatusBreakdown,
      recentPatients,
    };
  }

  async getPatientTimeline(orgId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId: orgId,
      },
      select: {
        id: true,
        lifecycleStage: true,
        createdAt: true,
        updatedAt: true,
        fhirResource: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const documents = await this.prisma.document.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const clinicalEvents = await this.prisma.clinicalEvent.findMany({
      where: { patientId: patient.id, organizationId: orgId },
      include: {
        alert: true,
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });

    const events = [
      {
        type: 'PATIENT_CREATED',
        at: patient.createdAt,
        detail: `Patient created at lifecycle stage ${patient.lifecycleStage}`,
      },
      ...documents.map((document) => ({
        type: 'DOCUMENT',
        at: document.createdAt,
        detail: `${document.type} - ${document.status}`,
      })),
      ...clinicalEvents.map((event) => ({
        type: event.alert ? 'CLINICAL_ALERT' : 'CLINICAL_EVENT',
        at: event.occurredAt,
        detail: `${event.type} - ${event.severity}${event.alert ? ` (${event.alert.status})` : ''}`,
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    return {
      patient,
      documents,
      clinicalEvents,
      events,
    };
  }
}
