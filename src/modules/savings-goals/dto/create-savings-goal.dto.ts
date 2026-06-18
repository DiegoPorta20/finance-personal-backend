import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateSavingsGoalDto {
  @IsString()
  name!: string;

  @IsNumber()
  targetAmount!: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}
