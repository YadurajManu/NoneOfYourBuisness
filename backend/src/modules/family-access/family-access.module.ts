import { Module } from '@nestjs/common';
import { FamilyAccessController } from './family-access.controller';
import { FamilyAccessService } from './family-access.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [NotificationsModule, DocumentsModule],
  controllers: [FamilyAccessController],
  providers: [FamilyAccessService],
  exports: [FamilyAccessService],
})
export class FamilyAccessModule {}
