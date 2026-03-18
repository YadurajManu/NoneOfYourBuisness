import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatientsService } from '../patients/patients.service';
import type { AuthenticatedUser } from '../../types/jwt.types';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private aiService: AIService,
    private patientsService: PatientsService,
  ) {}

  @Post('query')
  query(@Body('prompt') prompt: string) {
    return this.aiService.chat([{ role: 'user', content: prompt }]);
  }

  @Get('summarize/:patientId')
  async summarizePatient(
    @Param('patientId') patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const patient = await this.patientsService.findOne(
      patientId,
      req.user.orgId,
    );
    return this.aiService.generateClinicalSummary(
      patient as unknown as Record<string, unknown>,
    );
  }
}
