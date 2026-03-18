import { IsInt, Max, Min } from 'class-validator';

export class UpdatePatientStageDto {
  @IsInt()
  @Min(1)
  @Max(10)
  stage: number;
}
