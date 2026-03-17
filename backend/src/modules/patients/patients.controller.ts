import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.patientsService.findAll(req.user.orgId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.patientsService.findOne(id, req.user.orgId);
  }

  @Post()
  async create(@Body() fhirResource: any, @Request() req: any) {
    return this.patientsService.create(req.user.orgId, fhirResource);
  }

  @Patch(':id/stage')
  async updateStage(@Param('id') id: string, @Body('stage') stage: number, @Request() req: any) {
    return this.patientsService.updateStage(id, req.user.orgId, stage);
  }
}
