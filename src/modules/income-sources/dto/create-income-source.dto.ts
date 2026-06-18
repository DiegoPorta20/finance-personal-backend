import { IsString, IsNumber, IsIn, IsDateString } from 'class-validator';

export class CreateIncomeSourceDto {
  @IsString()
  name!: string;

  @IsIn(['salary', 'freelance', 'rent_income', 'investment', 'other_income'])
  type!: string;

  @IsNumber()
  amount!: number;

  @IsIn(['weekly', 'biweekly', 'monthly'])
  periodicity!: string;

  @IsDateString()
  nextDate!: string;

  @IsString()
  accountId!: string;
}
