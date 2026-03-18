import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CareTaskStatus,
  ClinicalOrderStatus,
  MedicationPlanStatus,
  NotificationType,
  WorkflowAuditAction,
  WorkflowEntityType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateClinicalOrderDto } from './dto/create-clinical-order.dto';
import { UpdateClinicalOrderStatusDto } from './dto/update-clinical-order-status.dto';
import { CreateCareTaskDto } from './dto/create-care-task.dto';
import { UpdateCareTaskStatusDto } from './dto/update-care-task-status.dto';
import { CreateMedicationPlanDto } from './dto/create-medication-plan.dto';
import { UpdateMedicationPlanDto } from './dto/update-medication-plan.dto';

@Injectable()
export class ClinicalWorkflowsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createOrder(
    orgId: string,
    patientId: string,
    actorUserId: string,
    dto: CreateClinicalOrderDto,
  ) {
    await this.ensurePatientInOrganization(patientId, orgId);

    const dueAt = this.parseOptionalDate(dto.dueAt, 'dueAt');

    const order = await this.prisma.clinicalOrder.create({
      data: {
        organizationId: orgId,
        patientId,
        createdByUserId: actorUserId,
        assignedToUserId: dto.assignedToUserId,
        type: dto.type,
        priority: dto.priority,
        title: dto.title,
        description: dto.description,
        dueAt,
        metadata: dto.metadata as object | undefined,
      },
    });

    await this.logAudit({
      organizationId: orgId,
      patientId,
      actorUserId,
      action: WorkflowAuditAction.ORDER_CREATED,
      entityType: WorkflowEntityType.ORDER,
      entityId: order.id,
      metadata: {
        status: order.status,
        type: order.type,
        priority: order.priority,
      },
    });

    if (dto.notifyFamily !== false) {
      await this.notificationsService.emitToPatientFamily(
        orgId,
        patientId,
        NotificationType.CLINICAL_ORDER_CREATED,
        {
          orderId: order.id,
          title: order.title,
          type: order.type,
          priority: order.priority,
          status: order.status,
        },
      );
    }

    return order;
  }

  async listPatientOrders(orgId: string, patientId: string) {
    await this.ensurePatientInOrganization(patientId, orgId);

    return this.prisma.clinicalOrder.findMany({
      where: {
        organizationId: orgId,
        patientId,
      },
      include: {
        careTasks: true,
        medicationPlans: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async updateOrderStatus(
    orgId: string,
    actorUserId: string,
    orderId: string,
    dto: UpdateClinicalOrderStatusDto,
  ) {
    const existingOrder = await this.prisma.clinicalOrder.findFirst({
      where: {
        id: orderId,
        organizationId: orgId,
      },
    });

    if (!existingOrder) {
      throw new NotFoundException('Clinical order not found');
    }

    this.assertOrderTransition(existingOrder.status, dto.status);

    const now = new Date();
    const updatedOrder = await this.prisma.clinicalOrder.update({
      where: { id: existingOrder.id },
      data: {
        status: dto.status,
        assignedToUserId:
          dto.assignedToUserId ?? existingOrder.assignedToUserId,
        escalatedAt:
          dto.status === ClinicalOrderStatus.ESCALATED
            ? now
            : existingOrder.escalatedAt,
        completedAt:
          dto.status === ClinicalOrderStatus.COMPLETED
            ? now
            : dto.status === ClinicalOrderStatus.ACTIVE ||
                dto.status === ClinicalOrderStatus.IN_PROGRESS
              ? null
              : existingOrder.completedAt,
      },
    });

    const action =
      dto.status === ClinicalOrderStatus.ESCALATED
        ? WorkflowAuditAction.ORDER_ESCALATED
        : dto.status === ClinicalOrderStatus.COMPLETED
          ? WorkflowAuditAction.ORDER_COMPLETED
          : WorkflowAuditAction.ORDER_STATUS_UPDATED;

    await this.logAudit({
      organizationId: orgId,
      patientId: existingOrder.patientId,
      actorUserId,
      action,
      entityType: WorkflowEntityType.ORDER,
      entityId: existingOrder.id,
      note: dto.note,
      metadata: {
        previousStatus: existingOrder.status,
        nextStatus: dto.status,
        assignedToUserId: updatedOrder.assignedToUserId,
      },
    });

    if (dto.notifyFamily !== false) {
      if (dto.status === ClinicalOrderStatus.ESCALATED) {
        await this.notificationsService.emitToPatientFamily(
          orgId,
          existingOrder.patientId,
          NotificationType.CLINICAL_ORDER_ESCALATED,
          {
            orderId: existingOrder.id,
            title: existingOrder.title,
            status: dto.status,
            note: dto.note,
          },
        );
      }

      if (dto.status === ClinicalOrderStatus.COMPLETED) {
        await this.notificationsService.emitToPatientFamily(
          orgId,
          existingOrder.patientId,
          NotificationType.CLINICAL_ORDER_COMPLETED,
          {
            orderId: existingOrder.id,
            title: existingOrder.title,
            status: dto.status,
          },
        );
      }
    }

    return updatedOrder;
  }

  async createTask(
    orgId: string,
    actorUserId: string,
    orderId: string,
    dto: CreateCareTaskDto,
  ) {
    const order = await this.prisma.clinicalOrder.findFirst({
      where: {
        id: orderId,
        organizationId: orgId,
      },
      select: {
        id: true,
        patientId: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Clinical order not found');
    }

    const dueAt = this.parseOptionalDate(dto.dueAt, 'dueAt');

    const task = await this.prisma.careTask.create({
      data: {
        organizationId: orgId,
        patientId: order.patientId,
        clinicalOrderId: order.id,
        createdByUserId: actorUserId,
        assignedToUserId: dto.assignedToUserId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueAt,
        metadata: dto.metadata as object | undefined,
      },
    });

    await this.logAudit({
      organizationId: orgId,
      patientId: order.patientId,
      actorUserId,
      action: WorkflowAuditAction.TASK_CREATED,
      entityType: WorkflowEntityType.TASK,
      entityId: task.id,
      metadata: {
        taskType: task.type,
        status: task.status,
        orderId: order.id,
      },
    });

    return task;
  }

  async updateTaskStatus(
    orgId: string,
    actorUserId: string,
    taskId: string,
    dto: UpdateCareTaskStatusDto,
  ) {
    const task = await this.prisma.careTask.findFirst({
      where: {
        id: taskId,
        organizationId: orgId,
      },
    });

    if (!task) {
      throw new NotFoundException('Care task not found');
    }

    if (
      (task.status === CareTaskStatus.COMPLETED ||
        task.status === CareTaskStatus.CANCELLED) &&
      dto.status !== task.status
    ) {
      throw new BadRequestException('Cannot modify status of terminal task');
    }

    const now = new Date();
    const updatedTask = await this.prisma.careTask.update({
      where: { id: task.id },
      data: {
        status: dto.status,
        completedAt:
          dto.status === CareTaskStatus.COMPLETED
            ? now
            : dto.status === CareTaskStatus.OPEN ||
                dto.status === CareTaskStatus.IN_PROGRESS
              ? null
              : task.completedAt,
        escalatedAt:
          dto.status === CareTaskStatus.ESCALATED ? now : task.escalatedAt,
      },
    });

    await this.logAudit({
      organizationId: orgId,
      patientId: task.patientId,
      actorUserId,
      action: WorkflowAuditAction.TASK_STATUS_UPDATED,
      entityType: WorkflowEntityType.TASK,
      entityId: task.id,
      note: dto.note,
      metadata: {
        previousStatus: task.status,
        nextStatus: dto.status,
        orderId: task.clinicalOrderId,
      },
    });

    if (
      dto.status === CareTaskStatus.ESCALATED &&
      dto.notifyFamily !== false &&
      task.clinicalOrderId
    ) {
      await this.notificationsService.emitToPatientFamily(
        orgId,
        task.patientId,
        NotificationType.CLINICAL_ORDER_ESCALATED,
        {
          orderId: task.clinicalOrderId,
          taskId: task.id,
          taskTitle: task.title,
          status: dto.status,
          note: dto.note,
        },
      );
    }

    return updatedTask;
  }

  async listPatientTasks(orgId: string, patientId: string) {
    await this.ensurePatientInOrganization(patientId, orgId);

    return this.prisma.careTask.findMany({
      where: {
        organizationId: orgId,
        patientId,
      },
      include: {
        clinicalOrder: true,
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createMedicationPlan(
    orgId: string,
    patientId: string,
    actorUserId: string,
    dto: CreateMedicationPlanDto,
  ) {
    await this.ensurePatientInOrganization(patientId, orgId);

    if (dto.clinicalOrderId) {
      const order = await this.prisma.clinicalOrder.findFirst({
        where: {
          id: dto.clinicalOrderId,
          organizationId: orgId,
          patientId,
        },
        select: { id: true },
      });

      if (!order) {
        throw new NotFoundException('Linked clinical order not found');
      }
    }

    const startDate = this.parseRequiredDate(dto.startDate, 'startDate');
    const endDate = this.parseOptionalDate(dto.endDate, 'endDate');
    this.validateDateWindow(startDate, endDate);

    const plan = await this.prisma.medicationPlan.create({
      data: {
        organizationId: orgId,
        patientId,
        clinicalOrderId: dto.clinicalOrderId,
        prescribedByUserId: actorUserId,
        medicationName: dto.medicationName,
        dosage: dto.dosage,
        frequency: dto.frequency,
        route: dto.route,
        instructions: dto.instructions,
        startDate,
        endDate,
        status: dto.status,
        metadata: dto.metadata as object | undefined,
      },
    });

    await this.logAudit({
      organizationId: orgId,
      patientId,
      actorUserId,
      action: WorkflowAuditAction.MEDICATION_PLAN_CREATED,
      entityType: WorkflowEntityType.MEDICATION_PLAN,
      entityId: plan.id,
      metadata: {
        medicationName: plan.medicationName,
        status: plan.status,
      },
    });

    if (dto.notifyFamily !== false) {
      await this.notificationsService.emitToPatientFamily(
        orgId,
        patientId,
        NotificationType.MEDICATION_PLAN_UPDATED,
        {
          medicationPlanId: plan.id,
          medicationName: plan.medicationName,
          status: plan.status,
        },
      );
    }

    return plan;
  }

  async updateMedicationPlan(
    orgId: string,
    actorUserId: string,
    planId: string,
    dto: UpdateMedicationPlanDto,
  ) {
    const existingPlan = await this.prisma.medicationPlan.findFirst({
      where: {
        id: planId,
        organizationId: orgId,
      },
    });

    if (!existingPlan) {
      throw new NotFoundException('Medication plan not found');
    }

    const startDate = dto.startDate
      ? this.parseRequiredDate(dto.startDate, 'startDate')
      : existingPlan.startDate;
    const endDate = dto.endDate
      ? this.parseRequiredDate(dto.endDate, 'endDate')
      : existingPlan.endDate;
    this.validateDateWindow(startDate, endDate);

    const updatedPlan = await this.prisma.medicationPlan.update({
      where: { id: existingPlan.id },
      data: {
        medicationName: dto.medicationName,
        dosage: dto.dosage,
        frequency: dto.frequency,
        route: dto.route,
        instructions: dto.instructions,
        startDate,
        endDate,
        status: dto.status,
        metadata: dto.metadata as object | undefined,
      },
    });

    await this.logAudit({
      organizationId: orgId,
      patientId: existingPlan.patientId,
      actorUserId,
      action: WorkflowAuditAction.MEDICATION_PLAN_UPDATED,
      entityType: WorkflowEntityType.MEDICATION_PLAN,
      entityId: existingPlan.id,
      metadata: {
        medicationName: updatedPlan.medicationName,
        status: updatedPlan.status,
      },
    });

    if (dto.notifyFamily !== false) {
      await this.notificationsService.emitToPatientFamily(
        orgId,
        existingPlan.patientId,
        NotificationType.MEDICATION_PLAN_UPDATED,
        {
          medicationPlanId: updatedPlan.id,
          medicationName: updatedPlan.medicationName,
          status: updatedPlan.status,
        },
      );
    }

    return updatedPlan;
  }

  async listPatientMedicationPlans(orgId: string, patientId: string) {
    await this.ensurePatientInOrganization(patientId, orgId);

    return this.prisma.medicationPlan.findMany({
      where: {
        organizationId: orgId,
        patientId,
      },
      include: {
        clinicalOrder: true,
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });
  }

  async getPatientWorkflowSummary(orgId: string, patientId: string) {
    await this.ensurePatientInOrganization(patientId, orgId);

    const now = new Date();
    const [
      pendingOrders,
      escalatedOrders,
      openTasks,
      overdueTasks,
      activeMeds,
    ] = await Promise.all([
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
      this.prisma.clinicalOrder.count({
        where: {
          organizationId: orgId,
          patientId,
          status: ClinicalOrderStatus.ESCALATED,
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
      this.prisma.careTask.count({
        where: {
          organizationId: orgId,
          patientId,
          dueAt: { lt: now },
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
      this.prisma.medicationPlan.count({
        where: {
          organizationId: orgId,
          patientId,
          status: MedicationPlanStatus.ACTIVE,
        },
      }),
    ]);

    return {
      pendingOrders,
      escalatedOrders,
      openTasks,
      overdueTasks,
      activeMedications: activeMeds,
    };
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

  private parseOptionalDate(value: string | undefined, fieldName: string) {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName} timestamp`);
    }
    return parsed;
  }

  private parseRequiredDate(value: string, fieldName: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName} timestamp`);
    }
    return parsed;
  }

  private validateDateWindow(startDate: Date, endDate?: Date | null) {
    if (endDate && endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate must be after startDate');
    }
  }

  private assertOrderTransition(
    currentStatus: ClinicalOrderStatus,
    nextStatus: ClinicalOrderStatus,
  ) {
    const isCurrentTerminal =
      currentStatus === ClinicalOrderStatus.COMPLETED ||
      currentStatus === ClinicalOrderStatus.CANCELLED;

    if (isCurrentTerminal && currentStatus !== nextStatus) {
      throw new BadRequestException('Cannot modify status of terminal order');
    }
  }

  private async logAudit(params: {
    organizationId: string;
    patientId: string;
    actorUserId: string;
    action: WorkflowAuditAction;
    entityType: WorkflowEntityType;
    entityId: string;
    note?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.prisma.workflowAudit.create({
      data: {
        organizationId: params.organizationId,
        patientId: params.patientId,
        actorUserId: params.actorUserId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        note: params.note,
        metadata: params.metadata as object | undefined,
      },
    });
  }
}
