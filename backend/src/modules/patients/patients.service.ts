import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CareTaskStatus,
  CareTaskType,
  ClinicalOrderPriority,
  ClinicalOrderStatus,
  ClinicalOrderType,
  NotificationType,
  ReferralDestinationType,
  ReferralHandoffStatus,
  ReferralPriority,
  UserRole,
  WorkflowAuditAction,
  WorkflowEntityType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LifecycleOrchestrationService } from './lifecycle-orchestration.service';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { AssignPatientCareTeamDto } from './dto/assign-patient-care-team.dto';

const PRIMARY_DOCTOR_EXTENSION_URL =
  'https://aarogya360.app/fhir/StructureDefinition/primary-doctor-user-id';
const PREFERRED_SPECIALIST_EXTENSION_URL =
  'https://aarogya360.app/fhir/StructureDefinition/preferred-specialist-user-id';
const MRN_IDENTIFIER_SYSTEM = 'https://aarogya360.app/fhir/identifier/mrn';

type FhirExtension = {
  url?: unknown;
  valueString?: unknown;
  [key: string]: unknown;
};

type FhirPatientResource = {
  resourceType?: unknown;
  name?: Array<{
    text?: string;
    given?: string[];
    family?: string;
    [key: string]: unknown;
  }>;
  telecom?: Array<{ system?: string; value?: string; [key: string]: unknown }>;
  address?: Array<{
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    [key: string]: unknown;
  }>;
  identifier?: Array<{
    system?: string;
    value?: string;
    [key: string]: unknown;
  }>;
  extension?: FhirExtension[];
  gender?: string;
  birthDate?: string;
  [key: string]: unknown;
};

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
          lifecycleStage: 1,
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

  async updateProfile(
    id: string,
    orgId: string,
    _actorUserId: string,
    dto: UpdatePatientProfileDto,
  ) {
    const patient = await this.findOne(id, orgId);
    const resource = this.toFhirPatientResource(patient.fhirResource);

    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    if (firstName || lastName) {
      const existingPrimary =
        Array.isArray(resource.name) && resource.name.length > 0
          ? resource.name[0]
          : {};

      const nextGiven =
        firstName ||
        (Array.isArray(existingPrimary.given)
          ? existingPrimary.given[0]
          : undefined);
      const nextFamily = lastName || existingPrimary.family;

      resource.name = [
        {
          ...existingPrimary,
          given: nextGiven ? [nextGiven] : [],
          family: nextFamily,
          text: [nextGiven, nextFamily].filter(Boolean).join(' ').trim(),
        },
      ];
    }

    if (dto.gender) {
      resource.gender = dto.gender;
    }

    if (dto.birthDate) {
      resource.birthDate = dto.birthDate;
    }

    if (dto.email?.trim()) {
      this.upsertTelecom(resource, 'email', dto.email.trim());
    }

    if (dto.phone?.trim()) {
      this.upsertTelecom(resource, 'phone', dto.phone.trim());
    }

    if (
      dto.addressLine1?.trim() ||
      dto.city?.trim() ||
      dto.state?.trim() ||
      dto.postalCode?.trim() ||
      dto.country?.trim()
    ) {
      resource.address = [
        {
          line: dto.addressLine1?.trim()
            ? [dto.addressLine1.trim()]
            : undefined,
          city: dto.city?.trim() || undefined,
          state: dto.state?.trim() || undefined,
          postalCode: dto.postalCode?.trim() || undefined,
          country: dto.country?.trim() || undefined,
        },
      ];
    }

    if (dto.medicalRecordNumber?.trim()) {
      this.upsertIdentifier(
        resource,
        MRN_IDENTIFIER_SYSTEM,
        dto.medicalRecordNumber.trim(),
      );
    }

    const updated = await this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        fhirResource: resource as object,
      },
    });

    return updated;
  }

  async assignCareTeam(
    id: string,
    orgId: string,
    actorUserId: string,
    dto: AssignPatientCareTeamDto,
  ) {
    const patient = await this.findOne(id, orgId);
    const resource = this.toFhirPatientResource(patient.fhirResource);

    const nextPrimaryDoctorId = dto.primaryDoctorUserId ?? null;
    const nextSpecialistId = dto.preferredSpecialistUserId ?? null;

    const [doctor, specialist] = await Promise.all([
      nextPrimaryDoctorId
        ? this.prisma.user.findFirst({
            where: {
              id: nextPrimaryDoctorId,
              organizationId: orgId,
              role: UserRole.DOCTOR,
              isSuspended: false,
            },
            select: { id: true, email: true },
          })
        : Promise.resolve(null),
      nextSpecialistId
        ? this.prisma.user.findFirst({
            where: {
              id: nextSpecialistId,
              organizationId: orgId,
              role: UserRole.SPECIALIST,
              isSuspended: false,
            },
            select: { id: true, email: true },
          })
        : Promise.resolve(null),
    ]);

    if (nextPrimaryDoctorId && !doctor) {
      throw new BadRequestException(
        'Selected primary doctor is not active in organization',
      );
    }

    if (nextSpecialistId && !specialist) {
      throw new BadRequestException(
        'Selected specialist is not active in organization',
      );
    }

    this.upsertExtension(
      resource,
      PRIMARY_DOCTOR_EXTENSION_URL,
      doctor?.id || null,
    );
    this.upsertExtension(
      resource,
      PREFERRED_SPECIALIST_EXTENSION_URL,
      specialist?.id || null,
    );

    const createInitialTask = Boolean(dto.createInitialTask);
    const createReferral = Boolean(dto.createReferral);

    return this.prisma.$transaction(async (tx) => {
      const updatedPatient = await tx.patient.update({
        where: { id: patient.id },
        data: {
          fhirResource: resource as object,
        },
      });

      let createdTaskId: string | null = null;
      if (createInitialTask && doctor) {
        const task = await tx.careTask.create({
          data: {
            organizationId: orgId,
            patientId: patient.id,
            createdByUserId: actorUserId,
            assignedToUserId: doctor.id,
            type: CareTaskType.FOLLOW_UP,
            status: CareTaskStatus.OPEN,
            title: `Initial intake review for ${this.getPatientDisplayName(resource, patient.id)}`,
            description:
              'Admin-assigned initial patient intake review task from portal onboarding.',
          },
          select: { id: true },
        });
        createdTaskId = task.id;

        await tx.workflowAudit.create({
          data: {
            organizationId: orgId,
            patientId: patient.id,
            actorUserId,
            action: WorkflowAuditAction.TASK_CREATED,
            entityType: WorkflowEntityType.TASK,
            entityId: task.id,
            note: 'Initial intake task created during admin care-team assignment',
          },
        });
      }

      let createdOrderId: string | null = null;
      if (createReferral) {
        const order = await tx.clinicalOrder.create({
          data: {
            organizationId: orgId,
            patientId: patient.id,
            createdByUserId: actorUserId,
            assignedToUserId: specialist?.id || undefined,
            type: ClinicalOrderType.CONSULTATION,
            priority: ClinicalOrderPriority.MEDIUM,
            status: ClinicalOrderStatus.ACTIVE,
            title: `Specialist consult for ${this.getPatientDisplayName(resource, patient.id)}`,
            description:
              'Created from admin onboarding to bootstrap specialist workflow.',
          },
          select: { id: true },
        });
        createdOrderId = order.id;

        await tx.workflowAudit.create({
          data: {
            organizationId: orgId,
            patientId: patient.id,
            actorUserId,
            action: WorkflowAuditAction.ORDER_CREATED,
            entityType: WorkflowEntityType.ORDER,
            entityId: order.id,
            note: 'Bootstrap consultation order created from admin onboarding',
          },
        });

        const referral = await tx.referralHandoff.create({
          data: {
            organizationId: orgId,
            patientId: patient.id,
            clinicalOrderId: order.id,
            createdByUserId: actorUserId,
            assignedToUserId: specialist?.id || undefined,
            destinationType: ReferralDestinationType.INTERNAL_PROVIDER,
            destinationName: specialist?.email || 'Specialist Pool',
            reason:
              dto.referralReason?.trim() ||
              'Admin bootstrap referral for specialist caseload intake',
            priority: dto.referralPriority || ReferralPriority.MEDIUM,
            status: ReferralHandoffStatus.CREATED,
          },
          select: { id: true },
        });

        await tx.workflowAudit.create({
          data: {
            organizationId: orgId,
            patientId: patient.id,
            actorUserId,
            action: WorkflowAuditAction.REFERRAL_CREATED,
            entityType: WorkflowEntityType.REFERRAL,
            entityId: referral.id,
            note: 'Bootstrap referral created during admin care-team assignment',
          },
        });

        return {
          patient: updatedPatient,
          assignment: {
            primaryDoctorUserId: doctor?.id || null,
            primaryDoctorEmail: doctor?.email || null,
            preferredSpecialistUserId: specialist?.id || null,
            preferredSpecialistEmail: specialist?.email || null,
          },
          bootstrap: {
            createdCareTaskId: createdTaskId,
            createdConsultOrderId: createdOrderId,
            createdReferralId: referral.id,
          },
        };
      }

      return {
        patient: updatedPatient,
        assignment: {
          primaryDoctorUserId: doctor?.id || null,
          primaryDoctorEmail: doctor?.email || null,
          preferredSpecialistUserId: specialist?.id || null,
          preferredSpecialistEmail: specialist?.email || null,
        },
        bootstrap: {
          createdCareTaskId: createdTaskId,
          createdConsultOrderId: createdOrderId,
          createdReferralId: null,
        },
      };
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

  private toFhirPatientResource(resource: unknown): FhirPatientResource {
    if (!resource || typeof resource !== 'object') {
      throw new BadRequestException('Patient FHIR resource is invalid');
    }

    const typed = JSON.parse(JSON.stringify(resource)) as FhirPatientResource;
    if (typed.resourceType !== 'Patient') {
      throw new BadRequestException('Stored FHIR resourceType must be Patient');
    }

    return typed;
  }

  private upsertTelecom(
    resource: FhirPatientResource,
    system: 'email' | 'phone',
    value: string,
  ) {
    const current = Array.isArray(resource.telecom)
      ? [...resource.telecom]
      : [];
    const idx = current.findIndex((row) => row.system === system);
    const entry = {
      ...(idx >= 0 ? current[idx] : {}),
      system,
      value,
    };

    if (idx >= 0) {
      current[idx] = entry;
    } else {
      current.push(entry);
    }

    resource.telecom = current;
  }

  private upsertIdentifier(
    resource: FhirPatientResource,
    system: string,
    value: string,
  ) {
    const current = Array.isArray(resource.identifier)
      ? [...resource.identifier]
      : [];
    const idx = current.findIndex((row) => row.system === system);
    const entry = {
      ...(idx >= 0 ? current[idx] : {}),
      system,
      value,
    };

    if (idx >= 0) {
      current[idx] = entry;
    } else {
      current.push(entry);
    }

    resource.identifier = current;
  }

  private upsertExtension(
    resource: FhirPatientResource,
    url: string,
    value: string | null,
  ) {
    const current = Array.isArray(resource.extension)
      ? [...resource.extension]
      : [];
    const idx = current.findIndex((row) => String(row.url || '') === url);

    if (!value) {
      if (idx >= 0) {
        current.splice(idx, 1);
      }
    } else {
      const nextRow: FhirExtension = {
        ...(idx >= 0 ? current[idx] : {}),
        url,
        valueString: value,
      };

      if (idx >= 0) {
        current[idx] = nextRow;
      } else {
        current.push(nextRow);
      }
    }

    resource.extension = current.length > 0 ? current : undefined;
  }

  private getPatientDisplayName(
    resource: FhirPatientResource,
    fallbackId: string,
  ) {
    const primary = Array.isArray(resource.name) ? resource.name[0] : undefined;
    if (!primary) {
      return `Patient ${fallbackId.slice(0, 8)}`;
    }

    if (typeof primary.text === 'string' && primary.text.trim().length > 0) {
      return primary.text.trim();
    }

    const given = Array.isArray(primary.given)
      ? primary.given.join(' ').trim()
      : '';
    const family =
      typeof primary.family === 'string' ? primary.family.trim() : '';
    const fullName = [given, family].filter(Boolean).join(' ').trim();
    return fullName || `Patient ${fallbackId.slice(0, 8)}`;
  }
}
