import { SupportTicketCategory, SupportTicketPriority } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSupportTicketDto {
  @IsEnum(SupportTicketCategory)
  category: SupportTicketCategory;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsString()
  @MinLength(4)
  @MaxLength(160)
  subject: string;

  @IsString()
  @MinLength(4)
  @MaxLength(4000)
  body: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}
