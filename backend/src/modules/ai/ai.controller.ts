import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatientsService } from '../patients/patients.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private aiService: AIService,
    private patientsService: PatientsService,
  ) {}

  @Post('query')
  async query(@Body('prompt') prompt: string) {
    return this.aiService.chat([{ role: 'user', content: prompt }]);
  }

  @Get('summarize/:patientId')
  async summarizePatient(@Param('patientId') patientId: string, @Request() req: any) {
    const patient = await this.patientsService.findOne(patientId, req.user.orgId);
    return this.aiService.generateClinicalSummary(patient);
  }
}
