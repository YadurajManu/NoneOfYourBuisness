import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { DocumentsService } from '../documents/documents.service';
import { FamilyAccessService } from '../family-access/family-access.service';
import { GrantFamilyAccessDto } from '../family-access/dto/grant-family-access.dto';
import { RevokeFamilyAccessDto } from '../family-access/dto/revoke-family-access.dto';
import { RespondFamilyAccessInviteDto } from '../family-access/dto/respond-family-access-invite.dto';

@Injectable()
export class PatientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
    private readonly documentsService: DocumentsService,
    private readonly familyAccessService: FamilyAccessService,
  ) {}

  async getMe(orgId: string, userId: string) {
    const context = await this.resolvePatientContext(orgId, userId);

    return {
      user: {
        id: context.user.id,
        email: context.user.email,
        role: context.user.role,
      },
      patient: context.patient,
    };
  }

  async getTimeline(orgId: string, userId: string) {
    const context = await this.resolvePatientContext(orgId, userId);
    return this.dashboardService.getPatientTimeline(orgId, context.patient.id);
  }

  async getDocuments(orgId: string, userId: string) {
    const context = await this.resolvePatientContext(orgId, userId);
    return this.documentsService.findAllByPatient(orgId, context.patient.id);
  }

  async uploadDocument(
    orgId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const context = await this.resolvePatientContext(orgId, userId);
    return this.documentsService.create(orgId, context.patient.id, file);
  }

  async getDocumentDownload(orgId: string, userId: string, documentId: string) {
    const context = await this.resolvePatientContext(orgId, userId);
    return this.documentsService.getDocumentDownload(
      orgId,
      documentId,
      context.patient.id,
    );
  }

  async listFamilyAccess(orgId: string, userId: string) {
    const context = await this.resolvePatientContext(orgId, userId);
    return this.familyAccessService.listPatientAccessGrants(
      orgId,
      context.patient.id,
    );
  }

  async grantFamilyAccess(
    orgId: string,
    userId: string,
    body: GrantFamilyAccessDto,
  ) {
    const context = await this.resolvePatientContext(orgId, userId);
    return this.familyAccessService.grantAccess(
      orgId,
      userId,
      context.patient.id,
      body,
    );
  }

  async revokeFamilyAccess(
    orgId: string,
    userId: string,
    accessId: string,
    body: RevokeFamilyAccessDto,
  ) {
    await this.resolvePatientContext(orgId, userId);
    return this.familyAccessService.revokeAccess(orgId, userId, accessId, body);
  }

  async listFamilyAccessInvites(orgId: string, userId: string) {
    const context = await this.resolvePatientContext(orgId, userId);
    return this.familyAccessService.listPatientAccessInvites(
      orgId,
      context.patient.id,
    );
  }

  async respondFamilyAccessInvite(
    orgId: string,
    userId: string,
    inviteId: string,
    body: RespondFamilyAccessInviteDto,
  ) {
    await this.resolvePatientContext(orgId, userId);
    return this.familyAccessService.respondToInvite(
      orgId,
      userId,
      inviteId,
      body,
    );
  }

  async listFamilyAccessAudit(orgId: string, userId: string) {
    await this.resolvePatientContext(orgId, userId);
    return this.familyAccessService.listPatientAuditForPatientUser(
      orgId,
      userId,
    );
  }

  private async resolvePatientContext(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: orgId,
        role: 'PATIENT',
        isSuspended: false,
      },
      select: {
        id: true,
        email: true,
        role: true,
        patientProfileId: true,
      },
    });

    if (!user?.patientProfileId) {
      throw new ForbiddenException(
        'Patient account is not linked to a patient profile',
      );
    }

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: user.patientProfileId,
        organizationId: orgId,
      },
      select: {
        id: true,
        lifecycleStage: true,
        fhirResource: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!patient) {
      throw new ForbiddenException('Patient profile is not available');
    }

    return { user, patient };
  }
}
