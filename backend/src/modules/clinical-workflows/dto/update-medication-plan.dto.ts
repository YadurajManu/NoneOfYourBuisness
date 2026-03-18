import { MedicationPlanStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateMedicationPlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  medicationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  dosage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  frequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  instructions?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(MedicationPlanStatus)
  status?: MedicationPlanStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  notifyFamily?: boolean;
}
