import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { ClinicalEventsService } from './clinical-events.service';
import { CreateClinicalEventDto } from './dto/create-clinical-event.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';

@Controller('clinical-events')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
export class ClinicalEventsController {
  constructor(private readonly clinicalEventsService: ClinicalEventsService) {}

  @Post('patient/:patientId')
  createEvent(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: CreateClinicalEventDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalEventsService.createEvent(
      req.user.orgId,
      patientId,
      req.user.userId,
      body,
    );
  }

  @Get('patient/:patientId')
  listPatientEvents(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalEventsService.listPatientEvents(
      req.user.orgId,
      patientId,
    );
  }

  @Get('alerts/open')
  listOpenAlerts(@Req() req: { user: AuthenticatedUser }) {
    return this.clinicalEventsService.listOpenAlerts(req.user.orgId);
  }

  @Get('alerts/patient/:patientId')
  listPatientAlerts(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalEventsService.listPatientAlerts(
      req.user.orgId,
      patientId,
    );
  }

  @Patch('alerts/:alertId/status')
  updateAlertStatus(
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @Body() body: UpdateAlertStatusDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalEventsService.updateAlertStatus(
      req.user.orgId,
      req.user.userId,
      alertId,
      body,
    );
  }
}
