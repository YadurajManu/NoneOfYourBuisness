import { PriorAuthorizationStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePriorAuthorizationStatusDto {
  @IsEnum(PriorAuthorizationStatus)
  status: PriorAuthorizationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  externalReference?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  decisionNote?: string;

  @IsOptional()
  @IsBoolean()
  notifyFamily?: boolean;
}
