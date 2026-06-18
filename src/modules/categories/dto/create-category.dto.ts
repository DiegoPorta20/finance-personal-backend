import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  slug!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsIn(['income', 'expense'])
  type!: string;
}
