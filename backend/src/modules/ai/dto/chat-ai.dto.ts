import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChatAiDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  message: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
