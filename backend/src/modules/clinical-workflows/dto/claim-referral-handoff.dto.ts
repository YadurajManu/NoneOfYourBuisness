import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ClaimReferralHandoffDto {
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  note?: string;
}
