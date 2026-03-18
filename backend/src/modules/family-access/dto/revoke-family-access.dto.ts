import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RevokeFamilyAccessDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(400)
  note?: string;
}
