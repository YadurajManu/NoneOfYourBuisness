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
import { AdminService } from './admin.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserRoleDto } from './dto/update-admin-user-role.dto';
import { SetAdminUserSuspensionDto } from './dto/set-admin-user-suspension.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(@Req() req: { user: AuthenticatedUser }) {
    return this.adminService.listUsers(req.user.userId);
  }

  @Post('users')
  createUser(
    @Req() req: { user: AuthenticatedUser },
    @Body() body: CreateAdminUserDto,
  ) {
    return this.adminService.createUser(req.user.userId, body);
  }

  @Patch('users/:userId/role')
  updateUserRole(
    @Req() req: { user: AuthenticatedUser },
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateAdminUserRoleDto,
  ) {
    return this.adminService.updateUserRole(req.user.userId, userId, body.role);
  }

  @Patch('users/:userId/suspend')
  suspendUser(
    @Req() req: { user: AuthenticatedUser },
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: SetAdminUserSuspensionDto,
  ) {
    return this.adminService.setUserSuspension(
      req.user.userId,
      userId,
      body.suspended,
    );
  }

  @Get('audit-events')
  listAuditEvents(@Req() req: { user: AuthenticatedUser }) {
    return this.adminService.listAuditEvents(req.user.userId);
  }
}
