import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { FamilyAccessLevel } from '@prisma/client';

export class GrantFamilyAccessDto {
  @ValidateIf((dto: GrantFamilyAccessDto) => !dto.familyEmail)
  @IsUUID()
  @IsOptional()
  familyUserId?: string;

  @ValidateIf((dto: GrantFamilyAccessDto) => !dto.familyUserId)
  @IsEmail()
  @IsOptional()
  familyEmail?: string;

  @IsEnum(FamilyAccessLevel)
  accessLevel: FamilyAccessLevel;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(400)
  consentNote?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
