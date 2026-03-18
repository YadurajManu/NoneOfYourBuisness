import { PriorAuthorizationStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePriorAuthorizationDto {
  @IsOptional()
  @IsUUID()
  clinicalOrderId?: string;

  @IsString()
  @MaxLength(180)
  payerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  policyNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceCodes?: string[];

  @IsOptional()
  @IsObject()
  requestPayload?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(PriorAuthorizationStatus)
  status?: PriorAuthorizationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  externalReference?: string;

  @IsOptional()
  @IsBoolean()
  notifyFamily?: boolean;
}
