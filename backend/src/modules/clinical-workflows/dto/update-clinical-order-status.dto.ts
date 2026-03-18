import { ClinicalOrderStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateClinicalOrderStatusDto {
  @IsEnum(ClinicalOrderStatus)
  status: ClinicalOrderStatus;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsBoolean()
  notifyFamily?: boolean;
}
