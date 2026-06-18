import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddFundsDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  // Cuenta de la que se descuenta el abono (opcional).
  @IsOptional()
  @IsString()
  accountId?: string;
}
