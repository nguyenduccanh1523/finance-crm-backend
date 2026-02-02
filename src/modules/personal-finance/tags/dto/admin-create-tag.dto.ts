import { IsOptional, IsString } from 'class-validator';

export class AdminCreateTagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
