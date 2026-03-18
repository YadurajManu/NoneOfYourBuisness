import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(@Req() req: { user: AuthenticatedUser }) {
    return this.dashboardService.getOverview(req.user.orgId);
  }

  @Get('patient/:patientId/timeline')
  getPatientTimeline(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.dashboardService.getPatientTimeline(req.user.orgId, patientId);
  }
}
