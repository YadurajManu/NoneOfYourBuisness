import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { PatientPortalService } from './patient-portal.service';
import { GrantFamilyAccessDto } from '../family-access/dto/grant-family-access.dto';
import { RevokeFamilyAccessDto } from '../family-access/dto/revoke-family-access.dto';
import { RespondFamilyAccessInviteDto } from '../family-access/dto/respond-family-access-invite.dto';
import { DOCUMENT_UPLOAD_INTERCEPTOR_OPTIONS } from '../documents/document-upload.config';

@Controller('patient')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.PATIENT)
export class PatientPortalController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  @Get('me')
  me(@Req() req: { user: AuthenticatedUser }) {
    return this.patientPortalService.getMe(req.user.orgId, req.user.userId);
  }

  @Get('timeline')
  timeline(@Req() req: { user: AuthenticatedUser }) {
    return this.patientPortalService.getTimeline(
      req.user.orgId,
      req.user.userId,
    );
  }

  @Get('documents')
  documents(@Req() req: { user: AuthenticatedUser }) {
    return this.patientPortalService.getDocuments(
      req.user.orgId,
      req.user.userId,
    );
  }

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file', DOCUMENT_UPLOAD_INTERCEPTOR_OPTIONS))
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: AuthenticatedUser },
  ) {
    if (!file) {
      throw new BadRequestException(
        'File is required and must be a supported type (PDF/image/text) within upload size limit.',
      );
    }

    return this.patientPortalService.uploadDocument(
      req.user.orgId,
      req.user.userId,
      file,
    );
  }

  @Get('documents/:documentId/download')
  async downloadDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: { user: AuthenticatedUser },
    @Res() res: Response,
  ) {
    const file = await this.patientPortalService.getDocumentDownload(
      req.user.orgId,
      req.user.userId,
      documentId,
    );

    res.setHeader('Content-Type', file.contentType);
    return res.download(file.filePath, file.fileName);
  }

  @Get('family-access')
  listFamilyAccess(@Req() req: { user: AuthenticatedUser }) {
    return this.patientPortalService.listFamilyAccess(
      req.user.orgId,
      req.user.userId,
    );
  }

  @Post('family-access/grant')
  grantFamilyAccess(
    @Body() body: GrantFamilyAccessDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientPortalService.grantFamilyAccess(
      req.user.orgId,
      req.user.userId,
      body,
    );
  }

  @Patch('family-access/:accessId/revoke')
  revokeFamilyAccess(
    @Param('accessId', ParseUUIDPipe) accessId: string,
    @Body() body: RevokeFamilyAccessDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientPortalService.revokeFamilyAccess(
      req.user.orgId,
      req.user.userId,
      accessId,
      body,
    );
  }

  @Get('family-access/invites')
  listFamilyAccessInvites(@Req() req: { user: AuthenticatedUser }) {
    return this.patientPortalService.listFamilyAccessInvites(
      req.user.orgId,
      req.user.userId,
    );
  }

  @Patch('family-access/invites/:inviteId/respond')
  respondFamilyAccessInvite(
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @Body() body: RespondFamilyAccessInviteDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientPortalService.respondFamilyAccessInvite(
      req.user.orgId,
      req.user.userId,
      inviteId,
      body,
    );
  }

  @Get('family-access/audit')
  listFamilyAccessAudit(@Req() req: { user: AuthenticatedUser }) {
    return this.patientPortalService.listFamilyAccessAudit(
      req.user.orgId,
      req.user.userId,
    );
  }
}
