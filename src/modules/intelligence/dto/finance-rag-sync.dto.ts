import { IsEmpty, IsNumber, IsString } from 'class-validator';

export class FinanceRagSyncDto {
  @IsString()
  @IsEmpty()
  workspaceId!: string;

  @IsString()
  budgetId!: string;

  @IsString()
  goalId!: string;

  @IsString()
  month!: string;

  @IsNumber()
  transactionWindowDays!: number;

  @IsNumber()
  transactionLimit!: number;
}
