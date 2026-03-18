import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatientsService } from '../patients/patients.service';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { QueryAiDto } from './dto/query-ai.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
export class AiController {
  constructor(
    private aiService: AIService,
    private patientsService: PatientsService,
  ) {}

  @Post('query')
  query(@Body() body: QueryAiDto) {
    return this.aiService.chat([{ role: 'user', content: body.prompt }]);
  }

  @Get('summarize/:patientId')
  async summarizePatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const patient = await this.patientsService.findOne(
      patientId,
      req.user.orgId,
    );
    return this.aiService.generateClinicalSummary(patient);
  }
}
