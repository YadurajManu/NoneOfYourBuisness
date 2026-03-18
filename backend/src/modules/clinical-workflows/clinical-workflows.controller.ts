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
}
