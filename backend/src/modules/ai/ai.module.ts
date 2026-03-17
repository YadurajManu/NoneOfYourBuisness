import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AIService } from './ai.service';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [PatientsModule],
  controllers: [AiController],
  providers: [AIService],
  exports: [AIService],
})
export class AiModule {}
