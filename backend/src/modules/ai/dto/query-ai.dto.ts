import { IsString, MinLength, MaxLength } from 'class-validator';

export class QueryAiDto {
  @IsString()
  @MinLength(2)
  @MaxLength(8000)
  prompt: string;
}
