import { IsBoolean } from 'class-validator';

export class SetAdminUserSuspensionDto {
  @IsBoolean()
  suspended: boolean;
}
