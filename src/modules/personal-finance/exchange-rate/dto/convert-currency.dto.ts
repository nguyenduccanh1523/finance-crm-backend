import { IsNumber, IsString, Matches, Min, IsOptional } from 'class-validator';

export class ConvertCurrencyDto {
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/i)
  from!: string;

  @IsString()
  @Matches(/^[A-Z]{3}$/i)
  to!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsString()
  providers?: string;
}
