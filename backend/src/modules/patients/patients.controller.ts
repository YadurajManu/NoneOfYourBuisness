import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientStageDto } from './dto/update-patient-stage.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { AssignPatientCareTeamDto } from './dto/assign-patient-care-team.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('patients')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Get()
  findAll(@Req() req: { user: AuthenticatedUser }) {
    return this.patientsService.findAll(req.user.orgId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.findOne(id, req.user.orgId);
  }

  @Get(':id/lifecycle/status')
  getLifecycleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.getLifecycleStatus(id, req.user.orgId);
  }

  @Get(':id/lifecycle/transitions')
  listLifecycleTransitions(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.listLifecycleTransitions(id, req.user.orgId);
  }

  @Post()
  create(
    @Body(new ValidationPipe({ whitelist: false, transform: true }))
    fhirResource: CreatePatientDto & Record<string, unknown>,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.create(
      req.user.orgId,
      req.user.userId,
      fhirResource as Record<string, unknown>,
    );
  }

  @Patch(':id/stage')
  updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePatientStageDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.updateStage(
      id,
      req.user.orgId,
      req.user.userId,
      body.stage,
      {
        reason: body.reason,
        metadata: body.metadata,
        skipAutomations: body.skipAutomations,
      },
    );
  }

  @Patch(':id/profile')
  @Roles(UserRole.ADMIN)
  updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePatientProfileDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.updateProfile(
      id,
      req.user.orgId,
      req.user.userId,
      body,
    );
  }

  @Patch(':id/care-team')
  @Roles(UserRole.ADMIN)
  assignCareTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignPatientCareTeamDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.assignCareTeam(
      id,
      req.user.orgId,
      req.user.userId,
      body,
    );
  }
}
