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
import { FamilyAccessService } from './family-access.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { GrantFamilyAccessDto } from './dto/grant-family-access.dto';
import { RevokeFamilyAccessDto } from './dto/revoke-family-access.dto';

@Controller('family-access')
@UseGuards(JwtAuthGuard)
export class FamilyAccessController {
  constructor(private readonly familyAccessService: FamilyAccessService) {}

  @Post('family-member')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  createFamilyMember(
    @Body() body: CreateFamilyMemberDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.createFamilyMember(req.user.orgId, body);
  }

  @Post('grant/:patientId')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  grantAccess(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: GrantFamilyAccessDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.grantAccess(
      req.user.orgId,
      req.user.userId,
      patientId,
      body,
    );
  }

  @Patch('revoke/:accessId')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  revokeAccess(
    @Param('accessId', ParseUUIDPipe) accessId: string,
    @Body() body: RevokeFamilyAccessDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.revokeAccess(
      req.user.orgId,
      req.user.userId,
      accessId,
      body,
    );
  }

  @Get('patient/:patientId')
  @Roles(UserRole.FAMILY_MEMBER)
  getMyPatientView(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.getMyPatientView(
      req.user.orgId,
      req.user.userId,
      patientId,
    );
  }

  @Get('my-patients')
  @Roles(UserRole.FAMILY_MEMBER)
  listMyPatients(@Req() req: { user: AuthenticatedUser }) {
    return this.familyAccessService.listMyPatients(
      req.user.orgId,
      req.user.userId,
    );
  }

  @Get('patient/:patientId/grants')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  listPatientGrants(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.listPatientAccessGrants(
      req.user.orgId,
      patientId,
    );
  }

  @Get('notifications')
  @Roles(UserRole.FAMILY_MEMBER)
  listMyNotifications(@Req() req: { user: AuthenticatedUser }) {
    return this.familyAccessService.listMyNotifications(
      req.user.orgId,
      req.user.userId,
    );
  }

  @Patch('notifications/:notificationId/read')
  @Roles(UserRole.FAMILY_MEMBER)
  markNotificationRead(
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.markNotificationRead(
      req.user.orgId,
      req.user.userId,
      notificationId,
    );
  }
}
