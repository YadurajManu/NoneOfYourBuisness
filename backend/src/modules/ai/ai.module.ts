import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AIService } from './ai.service';
import { AiConversationService } from './ai-conversation.service';
import { PatientContextService } from './patient-context.service';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [PatientsModule],
  controllers: [AiController],
  providers: [AIService, AiConversationService, PatientContextService],
  exports: [AIService],
})
export class AiModule {}
