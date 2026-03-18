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
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload/:patientId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './data/uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadFile(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: AuthenticatedUser },
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
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
}
