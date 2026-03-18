import { ReferralPriority } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AssignPatientCareTeamDto {
  @IsOptional()
  @IsUUID()
  primaryDoctorUserId?: string | null;

  @IsOptional()
  @IsUUID()
  preferredSpecialistUserId?: string | null;

  @IsOptional()
  @IsBoolean()
  createInitialTask?: boolean;

  @IsOptional()
  @IsBoolean()
  createReferral?: boolean;

  @IsOptional()
  @IsEnum(ReferralPriority)
  referralPriority?: ReferralPriority;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  referralReason?: string;
}
