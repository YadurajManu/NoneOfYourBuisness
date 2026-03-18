import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFamilyQuestionDto {
  @IsString()
  @MinLength(4)
  @MaxLength(2000)
  question: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string;
}
