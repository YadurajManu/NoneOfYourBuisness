import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { FamilyAccessService } from './family-access.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { GrantFamilyAccessDto } from './dto/grant-family-access.dto';
import { RevokeFamilyAccessDto } from './dto/revoke-family-access.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { CreateFamilyQuestionDto } from './dto/create-family-question.dto';
import { AnswerFamilyQuestionDto } from './dto/answer-family-question.dto';
import { CreateFamilyAccessInviteDto } from './dto/create-family-access-invite.dto';
import { RespondFamilyAccessInviteDto } from './dto/respond-family-access-invite.dto';

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

  @Post('invite/:patientId')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  inviteAccess(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: CreateFamilyAccessInviteDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.createAccessInvite(
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

  @Get('patient/:patientId/invites')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  listPatientInvites(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.listPatientAccessInvites(
      req.user.orgId,
      patientId,
    );
  }

  @Get('patient/:patientId/audit')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  listPatientAudit(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.listPatientAccessAudit(
      req.user.orgId,
      patientId,
    );
  }

  @Get('patient/my/invites')
  @Roles(UserRole.PATIENT)
  listMyPendingInvites(@Req() req: { user: AuthenticatedUser }) {
    return this.familyAccessService.listPendingInvitesForPatient(
      req.user.orgId,
      req.user.userId,
    );
  }

  @Get('patient/my/audit')
  @Roles(UserRole.PATIENT)
  listMyAccessAudit(@Req() req: { user: AuthenticatedUser }) {
    return this.familyAccessService.listPatientAuditForPatientUser(
      req.user.orgId,
      req.user.userId,
    );
  }

  @Patch('patient/my/invites/:inviteId/respond')
  @Roles(UserRole.PATIENT)
  respondToMyInvite(
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @Body() body: RespondFamilyAccessInviteDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.respondToInvite(
      req.user.orgId,
      req.user.userId,
      inviteId,
      body,
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

  @Get('notification-preferences')
  @Roles(UserRole.FAMILY_MEMBER)
  getNotificationPreferences(@Req() req: { user: AuthenticatedUser }) {
    return this.familyAccessService.getMyNotificationPreferences(
      req.user.orgId,
      req.user.userId,
    );
  }

  @Patch('notification-preferences')
  @Roles(UserRole.FAMILY_MEMBER)
  updateNotificationPreferences(
    @Body() body: UpdateNotificationPreferencesDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.updateMyNotificationPreferences(
      req.user.orgId,
      req.user.userId,
      body,
    );
  }

  @Sse('notifications/stream')
  @Roles(UserRole.FAMILY_MEMBER)
  streamNotifications(
    @Req() req: { user: AuthenticatedUser },
  ): Observable<MessageEvent> {
    return this.familyAccessService.streamMyNotifications(
      req.user.orgId,
      req.user.userId,
    );
  }

  @Post('questions/:patientId')
  @Roles(UserRole.FAMILY_MEMBER)
  submitQuestion(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: CreateFamilyQuestionDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.submitFamilyQuestion(
      req.user.orgId,
      req.user.userId,
      patientId,
      body,
    );
  }

  @Get('questions/my')
  @Roles(UserRole.FAMILY_MEMBER)
  listMyQuestions(@Req() req: { user: AuthenticatedUser }) {
    return this.familyAccessService.listMyQuestions(
      req.user.orgId,
      req.user.userId,
    );
  }

  @Get('questions/patient/:patientId')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
  listPatientQuestions(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.listPatientQuestions(
      req.user.orgId,
      patientId,
    );
  }

  @Patch('questions/:questionId/answer')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
  answerQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() body: AnswerFamilyQuestionDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.familyAccessService.answerFamilyQuestion(
      req.user.orgId,
      req.user.userId,
      questionId,
      body,
    );
  }
}
