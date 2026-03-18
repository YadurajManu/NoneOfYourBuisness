import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsRealtimeService } from './notifications-realtime.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRealtimeService],
  exports: [NotificationsService, NotificationsRealtimeService],
})
export class NotificationsModule {}
