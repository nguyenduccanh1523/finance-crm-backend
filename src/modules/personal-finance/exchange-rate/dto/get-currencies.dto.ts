import { IsOptional, IsString } from 'class-validator';

export class GetCurrenciesDto {
  @IsOptional()
  @IsString()
  scope?: string;
}
