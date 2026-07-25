import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { AIService } from './ai.service';
import { AiConversationService } from './ai-conversation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PatientsService } from '../patients/patients.service';
import type { AuthenticatedUser } from '../../types/jwt.types';
import { QueryAiDto } from './dto/query-ai.dto';
import { ChatAiDto } from './dto/chat-ai.dto';

const ALL_ASSISTANT_ROLES = [
  UserRole.ADMIN,
  UserRole.CARE_COORDINATOR,
  UserRole.DOCTOR,
  UserRole.SPECIALIST,
  UserRole.PATIENT,
  UserRole.FAMILY_MEMBER,
];

const CLINICAL_ASSISTANT_ROLES = [
  UserRole.ADMIN,
  UserRole.CARE_COORDINATOR,
  UserRole.DOCTOR,
  UserRole.SPECIALIST,
];

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AIService,
    private readonly conversationService: AiConversationService,
    private readonly patientsService: PatientsService,
  ) {}

  /**
   * Role-aware, patient-grounded assistant with token streaming (SSE over POST).
   * Available to every portal role; access to a patient is enforced per role.
   */
  @Post('chat')
  @Roles(...ALL_ASSISTANT_ROLES)
  async chat(
    @Body() body: ChatAiDto,
    @Req() req: { user: AuthenticatedUser },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const result = await this.conversationService.streamConverse({
        user: req.user,
        patientId: body.patientId ?? null,
        conversationId: body.conversationId ?? null,
        message: body.message,
        onToken: (token) => send({ type: 'token', value: token }),
      });

      send({
        type: 'done',
        conversationId: result.conversationId,
        patientId: result.patientId,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Assistant request failed';
      send({ type: 'error', message });
    } finally {
      res.end();
    }
  }

  @Get('conversations')
  @Roles(...ALL_ASSISTANT_ROLES)
  listConversations(
    @Req() req: { user: AuthenticatedUser },
    @Query('patientId') patientId?: string,
  ) {
    return this.conversationService.listConversations(req.user, patientId);
  }

  @Get('conversations/:id')
  @Roles(...ALL_ASSISTANT_ROLES)
  getConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.conversationService.getConversation(req.user, id);
  }

  @Post('query')
  @Roles(...CLINICAL_ASSISTANT_ROLES)
  query(@Body() body: QueryAiDto) {
    return this.aiService.chat([{ role: 'user', content: body.prompt }]);
  }

  @Get('summarize/:patientId')
  @Roles(...CLINICAL_ASSISTANT_ROLES)
  async summarizePatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const patient = await this.patientsService.findOne(
      patientId,
      req.user.orgId,
    );
    return this.aiService.generateClinicalSummary(patient);
  }
}
