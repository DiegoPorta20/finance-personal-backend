import { IsString, IsNumber, IsIn, IsDateString, IsOptional } from 'class-validator';

export class CreateTransactionDto {
  @IsIn(['income', 'expense'])
  type!: string;

  @IsNumber()
  amount!: number;

  @IsDateString()
  date!: string;

  @IsString()
  accountId!: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
