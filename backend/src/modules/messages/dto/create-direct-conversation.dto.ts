import { DirectMessagePriority } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDirectConversationDto {
  @IsUUID()
  recipientUserId: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  initialMessage?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsEnum(DirectMessagePriority)
  priority?: DirectMessagePriority;
}
