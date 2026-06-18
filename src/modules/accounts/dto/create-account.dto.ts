import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  name!: string;

  @IsIn(['bank', 'cash', 'digital_wallet'])
  type!: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
