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
import { ClinicalWorkflowsService } from './clinical-workflows.service';
import { CreateClinicalOrderDto } from './dto/create-clinical-order.dto';
import { UpdateClinicalOrderStatusDto } from './dto/update-clinical-order-status.dto';
import { CreateCareTaskDto } from './dto/create-care-task.dto';
import { UpdateCareTaskStatusDto } from './dto/update-care-task-status.dto';
import { CreateMedicationPlanDto } from './dto/create-medication-plan.dto';
import { UpdateMedicationPlanDto } from './dto/update-medication-plan.dto';
import { CreatePriorAuthorizationDto } from './dto/create-prior-authorization.dto';
import { UpdatePriorAuthorizationStatusDto } from './dto/update-prior-authorization-status.dto';
import { CreateReferralHandoffDto } from './dto/create-referral-handoff.dto';
import { UpdateReferralHandoffStatusDto } from './dto/update-referral-handoff-status.dto';
import { ClaimReferralHandoffDto } from './dto/claim-referral-handoff.dto';

@Controller('clinical-workflows')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SPECIALIST)
export class ClinicalWorkflowsController {
  constructor(
    private readonly clinicalWorkflowsService: ClinicalWorkflowsService,
  ) {}

  @Post('patient/:patientId/orders')
  createOrder(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: CreateClinicalOrderDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.createOrder(
      req.user.orgId,
      patientId,
      req.user.userId,
      body,
    );
  }

  @Get('patient/:patientId/orders')
  listPatientOrders(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.listPatientOrders(
      req.user.orgId,
      patientId,
    );
  }

  @Patch('orders/:orderId/status')
  updateOrderStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: UpdateClinicalOrderStatusDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.updateOrderStatus(
      req.user.orgId,
      req.user.userId,
      orderId,
      body,
    );
  }

  @Post('orders/:orderId/tasks')
  createTask(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: CreateCareTaskDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.createTask(
      req.user.orgId,
      req.user.userId,
      orderId,
      body,
    );
  }

  @Patch('tasks/:taskId/status')
  updateTaskStatus(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: UpdateCareTaskStatusDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.updateTaskStatus(
      req.user.orgId,
      req.user.userId,
      taskId,
      body,
    );
  }

  @Get('patient/:patientId/tasks')
  listPatientTasks(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.listPatientTasks(
      req.user.orgId,
      patientId,
    );
  }

  @Post('patient/:patientId/medications')
  createMedicationPlan(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: CreateMedicationPlanDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.createMedicationPlan(
      req.user.orgId,
      patientId,
      req.user.userId,
      body,
    );
  }

  @Patch('medications/:planId')
  updateMedicationPlan(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() body: UpdateMedicationPlanDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.updateMedicationPlan(
      req.user.orgId,
      req.user.userId,
      planId,
      body,
    );
  }

  @Get('patient/:patientId/medications')
  listPatientMedicationPlans(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.listPatientMedicationPlans(
      req.user.orgId,
      patientId,
    );
  }

  @Get('patient/:patientId/summary')
  getPatientWorkflowSummary(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.getPatientWorkflowSummary(
      req.user.orgId,
      patientId,
    );
  }

  @Post('patient/:patientId/prior-auths')
  createPriorAuthorization(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: CreatePriorAuthorizationDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.createPriorAuthorization(
      req.user.orgId,
      patientId,
      req.user.userId,
      body,
    );
  }

  @Get('patient/:patientId/prior-auths')
  listPatientPriorAuthorizations(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.listPatientPriorAuthorizations(
      req.user.orgId,
      patientId,
    );
  }

  @Patch('prior-auths/:priorAuthId/status')
  updatePriorAuthorizationStatus(
    @Param('priorAuthId', ParseUUIDPipe) priorAuthId: string,
    @Body() body: UpdatePriorAuthorizationStatusDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.updatePriorAuthorizationStatus(
      req.user.orgId,
      req.user.userId,
      priorAuthId,
      body,
    );
  }

  @Post('patient/:patientId/referrals')
  createReferralHandoff(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: CreateReferralHandoffDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.createReferralHandoff(
      req.user.orgId,
      patientId,
      req.user.userId,
      body,
    );
  }

  @Get('patient/:patientId/referrals')
  listPatientReferrals(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.listPatientReferrals(
      req.user.orgId,
      patientId,
    );
  }

  @Get('referrals/pool')
  listReferralPool(@Req() req: { user: AuthenticatedUser }) {
    return this.clinicalWorkflowsService.listClaimableReferrals(req.user.orgId);
  }

  @Patch('referrals/:referralId/status')
  updateReferralStatus(
    @Param('referralId', ParseUUIDPipe) referralId: string,
    @Body() body: UpdateReferralHandoffStatusDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.updateReferralStatus(
      req.user.orgId,
      req.user.userId,
      referralId,
      body,
    );
  }

  @Patch('referrals/:referralId/claim')
  @Roles(UserRole.SPECIALIST)
  claimReferral(
    @Param('referralId', ParseUUIDPipe) referralId: string,
    @Body() body: ClaimReferralHandoffDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.clinicalWorkflowsService.claimReferralFromPool(
      req.user.orgId,
      req.user.userId,
      referralId,
      body,
    );
  }

  @Post('automation/overdue/run')
  runOverdueAutomation(@Req() req: { user: AuthenticatedUser }) {
    return this.clinicalWorkflowsService.runOverdueAutomation(
      req.user.orgId,
      req.user.userId,
    );
  }
}
