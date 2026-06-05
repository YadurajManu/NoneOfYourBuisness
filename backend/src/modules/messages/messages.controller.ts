import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { MessagesService } from './messages.service';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.CARE_COORDINATOR,
  UserRole.DOCTOR,
  UserRole.SPECIALIST,
  UserRole.PATIENT,
  UserRole.FAMILY_MEMBER,
)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('users')
  searchUsers(
    @Req() req: { user: AuthenticatedUser },
    @Query('search') search?: string,
  ) {
    return this.messagesService.searchUsers(req.user, search || '');
  }

  @Get('conversations')
  listConversations(@Req() req: { user: AuthenticatedUser }) {
    return this.messagesService.listConversations(req.user);
  }

  @Get('context/patients')
  listContextPatients(
    @Req() req: { user: AuthenticatedUser },
    @Query('search') search?: string,
  ) {
    return this.messagesService.listContextPatients(req.user, search || '');
  }

  @Get('context/patients/:patientId/documents')
  listContextDocuments(
    @Req() req: { user: AuthenticatedUser },
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.messagesService.listContextDocuments(req.user, patientId);
  }

  @Post('conversations')
  createConversation(
    @Req() req: { user: AuthenticatedUser },
    @Body() body: CreateDirectConversationDto,
  ) {
    return this.messagesService.createConversation(req.user, body);
  }

  @Get('conversations/:conversationId')
  getConversation(
    @Req() req: { user: AuthenticatedUser },
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.messagesService.getConversation(req.user, conversationId);
  }

  @Post('conversations/:conversationId/messages')
  addMessage(
    @Req() req: { user: AuthenticatedUser },
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() body: CreateDirectMessageDto,
  ) {
    return this.messagesService.addMessage(req.user, conversationId, body);
  }

  @Patch('conversations/:conversationId/read')
  markRead(
    @Req() req: { user: AuthenticatedUser },
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.messagesService.markRead(req.user, conversationId);
  }
}
