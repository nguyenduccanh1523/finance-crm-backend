import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  defaultCurrency?: string;
}
