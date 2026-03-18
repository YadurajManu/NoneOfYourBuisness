import { CareTaskType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCareTaskDto {
  @IsEnum(CareTaskType)
  type: CareTaskType;

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
}
