import { IsBoolean, IsString } from 'class-validator';

export class PatchPlanFlagDto {
  @IsString()
  flag: string; // ví dụ: "crm.pipeline"

  @IsBoolean()
  enabled: boolean; // true/false
}
