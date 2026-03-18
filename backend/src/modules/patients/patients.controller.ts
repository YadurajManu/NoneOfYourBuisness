import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../types/jwt.types';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Get()
  findAll(@Req() req: { user: AuthenticatedUser }) {
    return this.patientsService.findAll(req.user.orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { user: AuthenticatedUser }) {
    return this.patientsService.findOne(id, req.user.orgId);
  }

  @Post()
  create(
    @Body() fhirResource: Record<string, unknown>,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.create(req.user.orgId, fhirResource);
  }

  @Patch(':id/stage')
  updateStage(
    @Param('id') id: string,
    @Body('stage') stage: number,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.updateStage(id, req.user.orgId, stage);
  }
}
