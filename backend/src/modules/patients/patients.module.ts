import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClinicalWorkflowsModule } from '../clinical-workflows/clinical-workflows.module';
import { LifecycleOrchestrationService } from './lifecycle-orchestration.service';

@Module({
  imports: [NotificationsModule, ClinicalWorkflowsModule],
  providers: [PatientsService, LifecycleOrchestrationService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
