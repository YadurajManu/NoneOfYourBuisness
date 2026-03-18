import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsISO8601,
  MaxLength,
} from 'class-validator';
import {
  AlertPriority,
  ClinicalEventSeverity,
  ClinicalEventType,
} from '@prisma/client';

export class CreateClinicalEventDto {
  @IsEnum(ClinicalEventType)
  type: ClinicalEventType;

  @IsEnum(ClinicalEventSeverity)
  severity: ClinicalEventSeverity;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  description?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsBoolean()
  raiseAlert?: boolean;

  @IsOptional()
  @IsEnum(AlertPriority)
  alertPriority?: AlertPriority;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  alertTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  alertMessage?: string;

  @IsOptional()
  @IsBoolean()
  notifyFamily?: boolean;
}
