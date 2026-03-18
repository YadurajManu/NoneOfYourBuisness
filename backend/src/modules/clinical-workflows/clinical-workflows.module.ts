import { Module } from '@nestjs/common';
import { ClinicalWorkflowsController } from './clinical-workflows.controller';
import { ClinicalWorkflowsService } from './clinical-workflows.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ClinicalWorkflowsController],
  providers: [ClinicalWorkflowsService],
  exports: [ClinicalWorkflowsService],
})
export class ClinicalWorkflowsModule {}
