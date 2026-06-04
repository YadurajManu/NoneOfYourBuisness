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
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

@Controller('support')
@UseGuards(JwtAuthGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.CARE_COORDINATOR,
  UserRole.DOCTOR,
  UserRole.SPECIALIST,
  UserRole.PATIENT,
  UserRole.FAMILY_MEMBER,
)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  listTickets(@Req() req: { user: AuthenticatedUser }) {
    return this.supportService.listTickets(req.user);
  }

  @Post('tickets')
  createTicket(
    @Req() req: { user: AuthenticatedUser },
    @Body() body: CreateSupportTicketDto,
  ) {
    return this.supportService.createTicket(req.user, body);
  }

  @Get('tickets/:ticketId')
  getTicket(
    @Req() req: { user: AuthenticatedUser },
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ) {
    return this.supportService.getTicket(req.user, ticketId);
  }

  @Post('tickets/:ticketId/messages')
  addMessage(
    @Req() req: { user: AuthenticatedUser },
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() body: CreateSupportMessageDto,
  ) {
    return this.supportService.addMessage(req.user, ticketId, body);
  }

  @Patch('tickets/:ticketId')
  updateTicket(
    @Req() req: { user: AuthenticatedUser },
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() body: UpdateSupportTicketDto,
  ) {
    return this.supportService.updateTicket(req.user, ticketId, body);
  }

  @Get('assignees')
  listAssignees(@Req() req: { user: AuthenticatedUser }) {
    return this.supportService.listAssignees(req.user);
  }
}
