import { MedicationPlanStatus } from '@prisma/client';
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

export class CreateMedicationPlanDto {
  @IsOptional()
  @IsUUID()
  clinicalOrderId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  medicationName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  dosage: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  frequency: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  instructions?: string;

  @IsDateString()
  startDate: string;

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
