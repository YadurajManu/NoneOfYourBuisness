import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { AiModule } from '../ai/ai.module';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentStorageService } from './document-storage.service';
import { DocumentOcrService } from './document-ocr.service';
import { DocumentIntelligenceService } from './document-intelligence.service';

@Module({
  imports: [AiModule, DatabaseModule, NotificationsModule],
  providers: [
    DocumentsService,
    DocumentStorageService,
    DocumentOcrService,
    DocumentIntelligenceService,
  ],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
