import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AlertStatus,
  CareTaskStatus,
  ClinicalOrderStatus,
  DocStatus,
  PriorAuthorizationStatus,
  ReferralHandoffStatus,
  SupportTicketStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

const PRIMARY_DOCTOR_EXTENSION_URL =
  'https://aarogya360.app/fhir/StructureDefinition/primary-doctor-user-id';
const PREFERRED_SPECIALIST_EXTENSION_URL =
  'https://aarogya360.app/fhir/StructureDefinition/preferred-specialist-user-id';

type FhirExtension = {
  url?: unknown;
  valueString?: unknown;
};

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMyCaseload(orgId: string, userId: string, role: UserRole) {
    if (role === UserRole.SPECIALIST) {
      const [referrals, assignedOrders] = await Promise.all([
        this.prisma.referralHandoff.findMany({
          where: {
            organizationId: orgId,
            assignedToUserId: userId,
            status: {
              in: [
                ReferralHandoffStatus.CREATED,
                ReferralHandoffStatus.ACCEPTED,
                ReferralHandoffStatus.IN_PROGRESS,
                ReferralHandoffStatus.ESCALATED,
              ],
            },
          },
          select: { patientId: true },
        }),
        this.prisma.clinicalOrder.findMany({
          where: {
            organizationId: orgId,
            assignedToUserId: userId,
            status: {
              in: [
                ClinicalOrderStatus.ACTIVE,
                ClinicalOrderStatus.IN_PROGRESS,
                ClinicalOrderStatus.ESCALATED,
              ],
            },
          },
          select: { patientId: true },
        }),
      ]);

      const patientIds = Array.from(
        new Set([
          ...referrals.map((row) => row.patientId),
          ...assignedOrders.map((row) => row.patientId),
        ]),
      );

      return this.prisma.patient.findMany({
        where: {
          organizationId: orgId,
          id: { in: patientIds },
        },
        select: {
          id: true,
          lifecycleStage: true,
          updatedAt: true,
          fhirResource: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    return this.prisma.patient.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        lifecycleStage: true,
        updatedAt: true,
        fhirResource: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

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
      careTeamCandidates,
      urgentAlerts,
      overdueTasks,
      overdueReferralItems,
      failedDocuments,
      pendingFamilyInvites,
      openSupportTickets,
      staffUsers,
      activeTaskAssignments,
      activeOrderAssignments,
      activeReferralAssignments,
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
      this.prisma.patient.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          lifecycleStage: true,
          createdAt: true,
          updatedAt: true,
          fhirResource: true,
        },
      }),
      this.prisma.clinicalAlert.findMany({
        where: {
          organizationId: orgId,
          status: AlertStatus.OPEN,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        select: {
          id: true,
          patientId: true,
          priority: true,
          title: true,
          message: true,
          createdAt: true,
          patient: {
            select: {
              id: true,
              lifecycleStage: true,
              fhirResource: true,
            },
          },
        },
      }),
      this.prisma.careTask.findMany({
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
        orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          patientId: true,
          type: true,
          status: true,
          title: true,
          dueAt: true,
          assignedToUser: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
            },
          },
          patient: {
            select: {
              id: true,
              lifecycleStage: true,
              fhirResource: true,
            },
          },
        },
      }),
      this.prisma.referralHandoff.findMany({
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
        orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          patientId: true,
          destinationType: true,
          destinationName: true,
          priority: true,
          status: true,
          dueAt: true,
          assignedToUser: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
            },
          },
          patient: {
            select: {
              id: true,
              lifecycleStage: true,
              fhirResource: true,
            },
          },
        },
      }),
      this.prisma.document.findMany({
        where: {
          status: DocStatus.FAILED,
          patient: { organizationId: orgId },
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          patientId: true,
          type: true,
          status: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              lifecycleStage: true,
              fhirResource: true,
            },
          },
        },
      }),
      this.prisma.familyAccessInvite.findMany({
        where: {
          organizationId: orgId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          patientId: true,
          accessLevel: true,
          createdAt: true,
          expiresAt: true,
          familyUser: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          patient: {
            select: {
              id: true,
              lifecycleStage: true,
              fhirResource: true,
            },
          },
        },
      }),
      this.prisma.supportTicket.findMany({
        where: {
          organizationId: orgId,
          status: {
            in: [
              SupportTicketStatus.OPEN,
              SupportTicketStatus.IN_REVIEW,
              SupportTicketStatus.WAITING_ON_USER,
            ],
          },
        },
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          subject: true,
          category: true,
          priority: true,
          status: true,
          updatedAt: true,
          assignedToUser: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
            },
          },
          patient: {
            select: {
              id: true,
              lifecycleStage: true,
              fhirResource: true,
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: {
          organizationId: orgId,
          role: {
            in: [
              UserRole.ADMIN,
              UserRole.CARE_COORDINATOR,
              UserRole.DOCTOR,
              UserRole.SPECIALIST,
            ],
          },
          isSuspended: false,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
        },
        orderBy: [{ role: 'asc' }, { email: 'asc' }],
      }),
      this.prisma.careTask.groupBy({
        by: ['assignedToUserId'],
        where: {
          organizationId: orgId,
          assignedToUserId: { not: null },
          status: {
            in: [
              CareTaskStatus.OPEN,
              CareTaskStatus.IN_PROGRESS,
              CareTaskStatus.BLOCKED,
              CareTaskStatus.ESCALATED,
            ],
          },
        },
        _count: { assignedToUserId: true },
      }),
      this.prisma.clinicalOrder.groupBy({
        by: ['assignedToUserId'],
        where: {
          organizationId: orgId,
          assignedToUserId: { not: null },
          status: {
            in: [
              ClinicalOrderStatus.ACTIVE,
              ClinicalOrderStatus.IN_PROGRESS,
              ClinicalOrderStatus.ESCALATED,
            ],
          },
        },
        _count: { assignedToUserId: true },
      }),
      this.prisma.referralHandoff.groupBy({
        by: ['assignedToUserId'],
        where: {
          organizationId: orgId,
          assignedToUserId: { not: null },
          status: {
            in: [
              ReferralHandoffStatus.CREATED,
              ReferralHandoffStatus.ACCEPTED,
              ReferralHandoffStatus.IN_PROGRESS,
              ReferralHandoffStatus.ESCALATED,
            ],
          },
        },
        _count: { assignedToUserId: true },
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

    const unassignedPatients = careTeamCandidates
      .filter((patient) => {
        const primaryDoctorId = this.getPatientExtensionValue(
          patient.fhirResource,
          PRIMARY_DOCTOR_EXTENSION_URL,
        );
        const specialistId = this.getPatientExtensionValue(
          patient.fhirResource,
          PREFERRED_SPECIALIST_EXTENSION_URL,
        );
        return !primaryDoctorId || !specialistId;
      })
      .slice(0, 8)
      .map((patient) => ({
        ...patient,
        missingPrimaryDoctor: !this.getPatientExtensionValue(
          patient.fhirResource,
          PRIMARY_DOCTOR_EXTENSION_URL,
        ),
        missingSpecialist: !this.getPatientExtensionValue(
          patient.fhirResource,
          PREFERRED_SPECIALIST_EXTENSION_URL,
        ),
      }));

    const taskLoad = new Map<string, number>();
    for (const row of activeTaskAssignments) {
      if (row.assignedToUserId) {
        taskLoad.set(row.assignedToUserId, row._count.assignedToUserId);
      }
    }

    const orderLoad = new Map<string, number>();
    for (const row of activeOrderAssignments) {
      if (row.assignedToUserId) {
        orderLoad.set(row.assignedToUserId, row._count.assignedToUserId);
      }
    }

    const referralLoad = new Map<string, number>();
    for (const row of activeReferralAssignments) {
      if (row.assignedToUserId) {
        referralLoad.set(row.assignedToUserId, row._count.assignedToUserId);
      }
    }

    const staffWorkload = staffUsers
      .map((staff) => {
        const activeTasks = taskLoad.get(staff.id) ?? 0;
        const activeOrders = orderLoad.get(staff.id) ?? 0;
        const activeReferrals = referralLoad.get(staff.id) ?? 0;
        return {
          ...staff,
          activeTasks,
          activeOrders,
          activeReferrals,
          totalOpenWork: activeTasks + activeOrders + activeReferrals,
        };
      })
      .sort((a, b) => b.totalOpenWork - a.totalOpenWork)
      .slice(0, 8);

    const priorityActions = [
      {
        key: 'assign-care-team',
        label: 'Assign care teams',
        count: unassignedPatients.length,
        severity: unassignedPatients.length > 0 ? 'HIGH' : 'NORMAL',
        description:
          'Patients missing a primary doctor or preferred specialist.',
        route: '/portal/admin/patients',
      },
      {
        key: 'open-alerts',
        label: 'Review open alerts',
        count: openClinicalAlerts,
        severity: openClinicalAlerts > 0 ? 'URGENT' : 'NORMAL',
        description: 'Clinical alerts still open across the organization.',
        route: '/portal/admin/patients',
      },
      {
        key: 'overdue-work',
        label: 'Clear overdue work',
        count: overdueCareTasks + overdueReferrals,
        severity: overdueCareTasks + overdueReferrals > 0 ? 'HIGH' : 'NORMAL',
        description: 'Care tasks and referral handoffs past due date.',
        route: '/portal/admin/patients',
      },
      {
        key: 'failed-documents',
        label: 'Resolve failed documents',
        count: failedDocuments.length,
        severity: failedDocuments.length > 0 ? 'HIGH' : 'NORMAL',
        description: 'Documents that failed OCR or extraction.',
        route: '/portal/admin/patients',
      },
      {
        key: 'support-tickets',
        label: 'Route support tickets',
        count: openSupportTickets.length,
        severity: openSupportTickets.length > 0 ? 'MEDIUM' : 'NORMAL',
        description: 'Open internal support tickets needing ownership.',
        route: '/portal/support',
      },
      {
        key: 'family-consent',
        label: 'Monitor family consent',
        count: pendingFamilyInvites.length,
        severity: pendingFamilyInvites.length > 0 ? 'MEDIUM' : 'NORMAL',
        description: 'Pending family access invitations and consent actions.',
        route: '/portal/admin/patients',
      },
    ];

    const riskQueues = {
      unassignedPatients,
      urgentAlerts,
      overdueTasks,
      overdueReferrals: overdueReferralItems,
      failedDocuments,
      pendingFamilyInvites,
      openSupportTickets,
    };

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
      priorityActions,
      riskQueues,
      staffWorkload,
    };
  }

  private getPatientExtensionValue(resource: unknown, url: string) {
    if (!resource || typeof resource !== 'object') return null;
    const extensions = (resource as { extension?: FhirExtension[] }).extension;
    if (!Array.isArray(extensions)) return null;

    const match = extensions.find((extension) => extension?.url === url);
    if (!match?.valueString || typeof match.valueString !== 'string') {
      return null;
    }
    return match.valueString.trim() || null;
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
