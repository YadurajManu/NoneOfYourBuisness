import { DemoLeadStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateDemoLeadStatusDto {
  @IsEnum(DemoLeadStatus)
  status: DemoLeadStatus;
}
