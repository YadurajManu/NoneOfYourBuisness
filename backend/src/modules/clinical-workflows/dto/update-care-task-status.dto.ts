import { CareTaskStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateCareTaskStatusDto {
  @IsEnum(CareTaskStatus)
  status: CareTaskStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsBoolean()
  notifyFamily?: boolean;
}
