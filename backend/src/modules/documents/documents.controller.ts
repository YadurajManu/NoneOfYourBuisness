import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseUUIDPipe,
  Req,
  Res,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { DOCUMENT_UPLOAD_INTERCEPTOR_OPTIONS } from './document-upload.config';

@Controller('documents')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload/:patientId')
  @UseInterceptors(FileInterceptor('file', DOCUMENT_UPLOAD_INTERCEPTOR_OPTIONS))
  async uploadFile(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: AuthenticatedUser },
  ) {
    if (!file) {
      throw new BadRequestException(
        'File is required and must be a supported type (PDF/image/text) within upload size limit.',
      );
    }

    return this.documentsService.create(req.user.orgId, patientId, file);
  }

  @Get('patient/:patientId')
  async getPatientDocuments(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.documentsService.findAllByPatient(req.user.orgId, patientId);
  }

  @Get(':documentId/download')
  async downloadDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: { user: AuthenticatedUser },
    @Res() res: Response,
  ) {
    const file = await this.documentsService.getDocumentDownload(
      req.user.orgId,
      documentId,
    );

    res.setHeader('Content-Type', file.contentType);
    return res.download(file.filePath, file.fileName);
  }
}
