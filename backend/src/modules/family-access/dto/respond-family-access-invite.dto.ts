import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum FamilyInviteDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class RespondFamilyAccessInviteDto {
  @IsEnum(FamilyInviteDecision)
  decision: FamilyInviteDecision;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}
