import { IsString, MinLength } from 'class-validator';

export class CompanyAccessDto {
  @IsString()
  @MinLength(1)
  companyId!: string;
}
