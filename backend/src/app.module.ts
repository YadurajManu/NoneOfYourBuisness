import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AiModule } from './modules/ai/ai.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FamilyAccessModule } from './modules/family-access/family-access.module';
import { ClinicalEventsModule } from './modules/clinical-events/clinical-events.module';
import { ClinicalWorkflowsModule } from './modules/clinical-workflows/clinical-workflows.module';
import { RolesGuard } from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    AiModule,
    DocumentsModule,
    DashboardModule,
    NotificationsModule,
    FamilyAccessModule,
    ClinicalEventsModule,
    ClinicalWorkflowsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
