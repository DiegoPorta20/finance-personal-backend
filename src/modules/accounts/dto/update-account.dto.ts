import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['bank', 'cash', 'digital_wallet'])
  type?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
