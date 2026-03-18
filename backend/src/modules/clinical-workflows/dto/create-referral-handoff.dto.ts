import {
  ReferralDestinationType,
  ReferralPriority,
  ReferralHandoffStatus,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateReferralHandoffDto {
  @IsOptional()
  @IsUUID()
  clinicalOrderId?: string;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsEnum(ReferralDestinationType)
  destinationType: ReferralDestinationType;

  @IsString()
  @MaxLength(180)
  destinationName: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  reason?: string;

  @IsOptional()
  @IsEnum(ReferralPriority)
  priority?: ReferralPriority;

  @IsOptional()
  @IsEnum(ReferralHandoffStatus)
  status?: ReferralHandoffStatus;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  notifyFamily?: boolean;
}
