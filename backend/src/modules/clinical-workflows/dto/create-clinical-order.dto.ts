import { ClinicalOrderPriority, ClinicalOrderType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateClinicalOrderDto {
  @IsEnum(ClinicalOrderType)
  type: ClinicalOrderType;

  @IsOptional()
  @IsEnum(ClinicalOrderPriority)
  priority?: ClinicalOrderPriority;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  notifyFamily?: boolean;
}
