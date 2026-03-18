import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AlertStatus,
  CareTaskStatus,
  ClinicalOrderStatus,
  PriorAuthorizationStatus,
  ReferralHandoffStatus,
} from '@prisma/client';
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
      pendingClinicalOrders,
      escalatedClinicalOrders,
      overdueCareTasks,
      pendingPriorAuthorizations,
      activeReferrals,
      overdueReferrals,
      lifecycleGrouping,
      documentStatuses,
      alertStatuses,
      orderStatuses,
      careTaskStatuses,
      priorAuthorizationStatuses,
      referralStatuses,
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
      this.prisma.clinicalOrder.count({
        where: {
          organizationId: orgId,
          status: {
            in: [
              ClinicalOrderStatus.ACTIVE,
              ClinicalOrderStatus.IN_PROGRESS,
              ClinicalOrderStatus.ESCALATED,
            ],
          },
        },
      }),
      this.prisma.clinicalOrder.count({
        where: {
          organizationId: orgId,
          status: ClinicalOrderStatus.ESCALATED,
        },
      }),
      this.prisma.careTask.count({
        where: {
          organizationId: orgId,
          dueAt: { lt: new Date() },
          status: {
            in: [
              CareTaskStatus.OPEN,
              CareTaskStatus.IN_PROGRESS,
              CareTaskStatus.BLOCKED,
              CareTaskStatus.ESCALATED,
            ],
          },
        },
      }),
      this.prisma.priorAuthorization.count({
        where: {
          organizationId: orgId,
          status: {
            in: [
              PriorAuthorizationStatus.SUBMITTED,
              PriorAuthorizationStatus.IN_REVIEW,
              PriorAuthorizationStatus.APPEALED,
            ],
          },
        },
      }),
      this.prisma.referralHandoff.count({
        where: {
          organizationId: orgId,
          status: {
            in: [
              ReferralHandoffStatus.CREATED,
              ReferralHandoffStatus.ACCEPTED,
              ReferralHandoffStatus.IN_PROGRESS,
              ReferralHandoffStatus.ESCALATED,
            ],
          },
        },
      }),
      this.prisma.referralHandoff.count({
        where: {
          organizationId: orgId,
          dueAt: { lt: new Date() },
          status: {
            in: [
              ReferralHandoffStatus.CREATED,
              ReferralHandoffStatus.ACCEPTED,
              ReferralHandoffStatus.IN_PROGRESS,
              ReferralHandoffStatus.ESCALATED,
            ],
          },
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
      this.prisma.clinicalOrder.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: {
          status: true,
        },
      }),
      this.prisma.careTask.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: {
          status: true,
        },
      }),
      this.prisma.priorAuthorization.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: {
          status: true,
        },
      }),
      this.prisma.referralHandoff.groupBy({
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
    const orderStatusBreakdown = orderStatuses.map((entry) => ({
      status: entry.status,
      count: entry._count.status,
    }));
    const careTaskStatusBreakdown = careTaskStatuses.map((entry) => ({
      status: entry.status,
      count: entry._count.status,
    }));
    const priorAuthorizationStatusBreakdown = priorAuthorizationStatuses.map(
      (entry) => ({
        status: entry.status,
        count: entry._count.status,
      }),
    );
    const referralStatusBreakdown = referralStatuses.map((entry) => ({
      status: entry.status,
      count: entry._count.status,
    }));

    return {
      totals: {
        patients: totalPatients,
        documents: totalDocuments,
        clinicalEvents: totalClinicalEvents,
        openClinicalAlerts,
        pendingClinicalOrders,
        escalatedClinicalOrders,
        overdueCareTasks,
        pendingPriorAuthorizations,
        activeReferrals,
        overdueReferrals,
      },
      lifecycleBreakdown,
      documentStatusBreakdown,
      alertStatusBreakdown,
      orderStatusBreakdown,
      careTaskStatusBreakdown,
      priorAuthorizationStatusBreakdown,
      referralStatusBreakdown,
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

    const clinicalOrders = await this.prisma.clinicalOrder.findMany({
      where: { patientId: patient.id, organizationId: orgId },
      include: {
        careTasks: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const medicationPlans = await this.prisma.medicationPlan.findMany({
      where: { patientId: patient.id, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const careTasks = await this.prisma.careTask.findMany({
      where: { patientId: patient.id, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const priorAuthorizations = await this.prisma.priorAuthorization.findMany({
      where: { patientId: patient.id, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const referralHandoffs = await this.prisma.referralHandoff.findMany({
      where: { patientId: patient.id, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
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
      ...clinicalOrders.map((order) => ({
        type: 'CLINICAL_ORDER',
        at: order.createdAt,
        detail: `${order.type} - ${order.status}`,
      })),
      ...medicationPlans.map((plan) => ({
        type: 'MEDICATION_PLAN',
        at: plan.createdAt,
        detail: `${plan.medicationName} - ${plan.status}`,
      })),
      ...careTasks.map((task) => ({
        type: 'CARE_TASK',
        at: task.createdAt,
        detail: `${task.type} - ${task.status}`,
      })),
      ...priorAuthorizations.map((priorAuthorization) => ({
        type: 'PRIOR_AUTH',
        at: priorAuthorization.createdAt,
        detail: `${priorAuthorization.payerName} - ${priorAuthorization.status}`,
      })),
      ...referralHandoffs.map((referral) => ({
        type: 'REFERRAL',
        at: referral.createdAt,
        detail: `${referral.destinationType} - ${referral.status}`,
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    return {
      patient,
      documents,
      clinicalEvents,
      clinicalOrders,
      medicationPlans,
      careTasks,
      priorAuthorizations,
      referralHandoffs,
      events,
    };
  }
}
