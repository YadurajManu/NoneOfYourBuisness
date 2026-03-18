import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('doctors')
  listDoctors(@Req() req: { user: AuthenticatedUser }) {
    return this.usersService.listActiveDoctorsByOrganization(req.user.orgId);
  }

  @Get('specialists')
  listSpecialists(@Req() req: { user: AuthenticatedUser }) {
    return this.usersService.listActiveSpecialistsByOrganization(req.user.orgId);
  }
}
