import { IsString, MaxLength, MinLength } from 'class-validator';

export class AnswerFamilyQuestionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  answer: string;
}
