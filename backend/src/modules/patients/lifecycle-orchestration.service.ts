import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  AlertStatus,
  CareTaskStatus,
  ClinicalOrderStatus,
  DocStatus,
  LifecycleHookStatus,
  LifecycleTransitionType,
  MedicationPlanStatus,
  Prisma,
  ReferralHandoffStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ClinicalWorkflowsService } from '../clinical-workflows/clinical-workflows.service';
import {
  LIFECYCLE_STAGE_LABELS,
  LIFECYCLE_TRANSITIONS,
} from './lifecycle.constants';

type TransitionOptions = {
  reason?: string;
  metadata?: Record<string, unknown>;
  skipAutomations?: boolean;
};

@Injectable()
export class LifecycleOrchestrationService {
  private readonly logger = new Logger(LifecycleOrchestrationService.name);

  constructor(
    private prisma: PrismaService,
    private clinicalWorkflowsService: ClinicalWorkflowsService,
  ) {}

  async transitionPatientStage(
    orgId: string,
    patientId: string,
    actorUserId: string,
    targetStage: number,
    options: TransitionOptions,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId: orgId,
      },
      select: {
        id: true,
        lifecycleStage: true,
      },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    const fromStage = patient.lifecycleStage;
    if (fromStage === targetStage) {
      throw new BadRequestException('Patient is already in requested stage');
    }

    this.assertValidTransition(fromStage, targetStage);

    const blockers = await this.getTransitionBlockers(
      orgId,
      patientId,
      targetStage,
    );
    if (blockers.length > 0) {
      throw new BadRequestException(
        `Lifecycle transition blocked: ${blockers.join('; ')}`,
      );
    }

    const updatedPatient = await this.prisma.$transaction(async (tx) => {
      const nextPatient = await tx.patient.update({
        where: { id: patientId },
        data: {
          lifecycleStage: targetStage,
        },
      });

      await tx.patientLifecycleTransition.create({
        data: {
          organizationId: orgId,
          patientId,
          actorUserId,
          fromStage,
          toStage: targetStage,
          reason: options.reason,
          metadata: options.metadata as object | undefined,
          transitionType: LifecycleTransitionType.MANUAL,
        },
      });

      return nextPatient;
    });

    if (!options.skipAutomations) {
      await this.executeStageHooks(
        orgId,
        patientId,
        actorUserId,
        fromStage,
        targetStage,
      );
    }

    return updatedPatient;
  }

  async getLifecycleStatus(orgId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId: orgId,
      },
      select: {
        id: true,
        lifecycleStage: true,
      },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    const currentStage = patient.lifecycleStage;
    const candidates = LIFECYCLE_TRANSITIONS[currentStage] ?? [];

    const transitions = await Promise.all(
      candidates.map(async (targetStage) => {
        const blockers = await this.getTransitionBlockers(
          orgId,
          patient.id,
          targetStage,
        );
        return {
          toStage: targetStage,
          toStageLabel:
            LIFECYCLE_STAGE_LABELS[targetStage] ?? `Stage ${targetStage}`,
          blockers,
          allowed: blockers.length === 0,
        };
      }),
    );

    return {
      patientId: patient.id,
      currentStage,
      currentStageLabel:
        LIFECYCLE_STAGE_LABELS[currentStage] ?? `Stage ${currentStage}`,
      transitions,
    };
  }

  async listLifecycleTransitions(orgId: string, patientId: string) {
    await this.ensurePatientInOrganization(orgId, patientId);

    return this.prisma.patientLifecycleTransition.findMany({
      where: {
        organizationId: orgId,
        patientId,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private async executeStageHooks(
    orgId: string,
    patientId: string,
    actorUserId: string,
    fromStage: number,
    toStage: number,
  ) {
    const hooks = this.hooksForStage(toStage);
    for (const hook of hooks) {
      await this.runHookWithIdempotency({
        orgId,
        patientId,
        actorUserId,
        fromStage,
        toStage,
        hookKey: hook.hookKey,
        run: hook.run,
      });
    }
  }

  private hooksForStage(toStage: number): Array<{
    hookKey: string;
    run: (params: {
      orgId: string;
      patientId: string;
      actorUserId: string;
    }) => Promise<Record<string, unknown> | undefined>;
  }> {
    switch (toStage) {
      case 3:
        return [
          {
            hookKey: 'create-preauth-task',
            run: async ({ orgId, patientId, actorUserId }) => {
              const orderId = await this.getOrCreateAutomationOrder(
                orgId,
                patientId,
                actorUserId,
              );
              const task = await this.clinicalWorkflowsService.createTask(
                orgId,
                actorUserId,
                orderId,
                {
                  type: 'PRE_AUTH',
                  title: 'Prepare Prior Authorization Packet',
                  description:
                    'Auto-generated task to collect documentation for payer submission',
                  dueAt: new Date(
                    Date.now() + 48 * 60 * 60 * 1000,
                  ).toISOString(),
                },
              );
              return { orderId, taskId: task.id };
            },
          },
        ];
      case 4:
        return [
          {
            hookKey: 'create-prior-auth-draft',
            run: async ({ orgId, patientId, actorUserId }) => {
              const orderId = await this.getOrCreateAutomationOrder(
                orgId,
                patientId,
                actorUserId,
              );
              const priorAuth =
                await this.clinicalWorkflowsService.createPriorAuthorization(
                  orgId,
                  patientId,
                  actorUserId,
                  {
                    clinicalOrderId: orderId,
                    payerName: 'Pending Payer Assignment',
                    status: 'DRAFT',
                    notifyFamily: false,
                  },
                );
              return { orderId, priorAuthorizationId: priorAuth.id };
            },
          },
        ];
      case 5:
        return [
          {
            hookKey: 'create-referral-handoff',
            run: async ({ orgId, patientId, actorUserId }) => {
              const orderId = await this.getOrCreateAutomationOrder(
                orgId,
                patientId,
                actorUserId,
              );
              const referral =
                await this.clinicalWorkflowsService.createReferralHandoff(
                  orgId,
                  patientId,
                  actorUserId,
                  {
                    clinicalOrderId: orderId,
                    destinationType: 'INTERNAL_PROVIDER',
                    destinationName: 'Specialist Pool',
                    priority: 'MEDIUM',
                    reason:
                      'Auto-generated referral handoff for specialist coordination stage',
                    dueAt: new Date(
                      Date.now() + 72 * 60 * 60 * 1000,
                    ).toISOString(),
                    notifyFamily: false,
                  },
                );
              return { orderId, referralId: referral.id };
            },
          },
        ];
      case 6:
        return [
          {
            hookKey: 'create-medication-plan-draft',
            run: async ({ orgId, patientId, actorUserId }) => {
              const orderId = await this.getOrCreateAutomationOrder(
                orgId,
                patientId,
                actorUserId,
              );
              const medicationPlan =
                await this.clinicalWorkflowsService.createMedicationPlan(
                  orgId,
                  patientId,
                  actorUserId,
                  {
                    clinicalOrderId: orderId,
                    medicationName: 'Medication Plan Pending',
                    dosage: 'TBD',
                    frequency: 'TBD',
                    startDate: new Date().toISOString(),
                    status: 'PAUSED',
                    notifyFamily: false,
                  },
                );
              return { orderId, medicationPlanId: medicationPlan.id };
            },
          },
        ];
      default:
        return [];
    }
  }

  private async runHookWithIdempotency(params: {
    orgId: string;
    patientId: string;
    actorUserId: string;
    fromStage: number;
    toStage: number;
    hookKey: string;
    run: (params: {
      orgId: string;
      patientId: string;
      actorUserId: string;
    }) => Promise<Record<string, unknown> | undefined>;
  }) {
    let executionId: string | null = null;
    try {
      const execution = await this.prisma.lifecycleHookExecution.create({
        data: {
          organizationId: params.orgId,
          patientId: params.patientId,
          actorUserId: params.actorUserId,
          fromStage: params.fromStage,
          toStage: params.toStage,
          hookKey: params.hookKey,
          status: LifecycleHookStatus.PENDING,
        },
      });
      executionId = execution.id;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }

    try {
      const result = await params.run({
        orgId: params.orgId,
        patientId: params.patientId,
        actorUserId: params.actorUserId,
      });

      await this.prisma.lifecycleHookExecution.update({
        where: { id: executionId },
        data: {
          status: LifecycleHookStatus.APPLIED,
          result: result as object | undefined,
          errorMessage: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.lifecycleHookExecution.update({
        where: { id: executionId },
        data: {
          status: LifecycleHookStatus.FAILED,
          errorMessage: message.slice(0, 500),
        },
      });
      this.logger.error(
        `Lifecycle hook '${params.hookKey}' failed for patient ${params.patientId}: ${message}`,
      );
    }
  }

  private async getOrCreateAutomationOrder(
    orgId: string,
    patientId: string,
    actorUserId: string,
  ) {
    const existingOrder = await this.prisma.clinicalOrder.findFirst({
      where: {
        organizationId: orgId,
        patientId,
        status: {
          in: [
            ClinicalOrderStatus.ACTIVE,
            ClinicalOrderStatus.IN_PROGRESS,
            ClinicalOrderStatus.ESCALATED,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (existingOrder) {
      return existingOrder.id;
    }

    const order = await this.clinicalWorkflowsService.createOrder(
      orgId,
      patientId,
      actorUserId,
      {
        type: 'FOLLOW_UP',
        priority: 'MEDIUM',
        title: 'Lifecycle Automation Order',
        description:
          'Auto-generated order to anchor lifecycle automation tasks and workflows',
        notifyFamily: false,
      },
    );

    return order.id;
  }

  private assertValidTransition(fromStage: number, toStage: number) {
    const allowed = LIFECYCLE_TRANSITIONS[fromStage] ?? [];
    if (!allowed.includes(toStage)) {
      throw new BadRequestException(
        `Invalid lifecycle transition ${fromStage} -> ${toStage}`,
      );
    }
  }

  private async getTransitionBlockers(
    orgId: string,
    patientId: string,
    toStage: number,
  ) {
    const blockers: string[] = [];

    if (toStage >= 3) {
      const completedDocs = await this.prisma.document.count({
        where: {
          patientId,
          patient: { organizationId: orgId },
          status: DocStatus.COMPLETED,
        },
      });

      if (completedDocs === 0) {
        blockers.push('At least one completed document is required');
      }
    }

    if (toStage >= 5) {
      const existingOrders = await this.prisma.clinicalOrder.count({
        where: {
          organizationId: orgId,
          patientId,
        },
      });

      if (existingOrders === 0) {
        blockers.push('At least one clinical order is required');
      }
    }

    if (toStage >= 6) {
      const hasMedicationPlan = await this.prisma.medicationPlan.count({
        where: {
          organizationId: orgId,
          patientId,
          status: {
            in: [
              MedicationPlanStatus.ACTIVE,
              MedicationPlanStatus.PAUSED,
              MedicationPlanStatus.COMPLETED,
            ],
          },
        },
      });

      if (hasMedicationPlan === 0) {
        blockers.push(
          'Medication plan should be defined before treatment activation',
        );
      }
    }

    if (toStage >= 8) {
      const hasReferralPath = await this.prisma.referralHandoff.count({
        where: {
          organizationId: orgId,
          patientId,
        },
      });

      if (hasReferralPath === 0) {
        blockers.push(
          'Referral handoff should be established before monitoring stage',
        );
      }
    }

    if (toStage === 10) {
      const [openAlerts, openOrders, openTasks, openReferrals] =
        await Promise.all([
          this.prisma.clinicalAlert.count({
            where: {
              organizationId: orgId,
              patientId,
              status: AlertStatus.OPEN,
            },
          }),
          this.prisma.clinicalOrder.count({
            where: {
              organizationId: orgId,
              patientId,
              status: {
                in: [
                  ClinicalOrderStatus.ACTIVE,
                  ClinicalOrderStatus.IN_PROGRESS,
                  ClinicalOrderStatus.ESCALATED,
                ],
              },
            },
          }),
          this.prisma.careTask.count({
            where: {
              organizationId: orgId,
              patientId,
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
          this.prisma.referralHandoff.count({
            where: {
              organizationId: orgId,
              patientId,
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
        ]);

      if (openAlerts > 0) {
        blockers.push('Open clinical alerts must be resolved before closure');
      }
      if (openOrders > 0) {
        blockers.push(
          'Active clinical orders must be completed before closure',
        );
      }
      if (openTasks > 0) {
        blockers.push('Open care tasks must be completed before closure');
      }
      if (openReferrals > 0) {
        blockers.push('Open referrals must be completed before closure');
      }
    }

    return blockers;
  }

  private async ensurePatientInOrganization(orgId: string, patientId: string) {
    const exists = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId: orgId,
      },
      select: { id: true },
    });

    if (!exists) {
      throw new BadRequestException('Patient not found');
    }
  }
}
