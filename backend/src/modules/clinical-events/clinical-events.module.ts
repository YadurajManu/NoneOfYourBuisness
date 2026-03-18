import { Module } from '@nestjs/common';
import { ClinicalEventsController } from './clinical-events.controller';
import { ClinicalEventsService } from './clinical-events.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ClinicalEventsController],
  providers: [ClinicalEventsService],
})
export class ClinicalEventsModule {}
