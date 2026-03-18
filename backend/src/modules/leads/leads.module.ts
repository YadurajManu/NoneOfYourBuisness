import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsPublicController } from './leads-public.controller';
import { LeadsAdminController } from './leads-admin.controller';

@Module({
  providers: [LeadsService],
  controllers: [LeadsPublicController, LeadsAdminController],
  exports: [LeadsService],
})
export class LeadsModule {}
