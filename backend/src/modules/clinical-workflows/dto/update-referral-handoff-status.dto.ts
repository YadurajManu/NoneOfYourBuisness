import { ReferralHandoffStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateReferralHandoffStatusDto {
  @IsEnum(ReferralHandoffStatus)
  status: ReferralHandoffStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  note?: string;

  @IsOptional()
  @IsBoolean()
  notifyFamily?: boolean;
}
