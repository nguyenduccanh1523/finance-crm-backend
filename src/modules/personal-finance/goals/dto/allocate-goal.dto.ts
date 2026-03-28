import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class AllocateGoalDto {
  @IsNumber()
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  amountCents: number;

  @IsString()
  @IsOptional()
  note?: string;
}
