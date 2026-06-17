import { IsString, IsNumber, IsIn, IsDateString, IsOptional } from 'class-validator';

export class UpdateIncomeSourceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['salary', 'freelance', 'rent_income', 'investment', 'other_income'])
  type?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsIn(['weekly', 'biweekly', 'monthly'])
  periodicity?: string;

  @IsOptional()
  @IsDateString()
  nextDate?: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}
