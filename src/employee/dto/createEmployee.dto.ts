import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { EmploymentStatus } from '../employee.types.js';

export class CreateEmployeeDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  department: string;

  @IsString()
  position: string;

  @IsNumber()
  @Min(0)
  basicSalary: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allowances?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductions?: number;

  @IsOptional()
  @IsIn(Object.values(EmploymentStatus))
  employmentStatus?: string;

  @IsDateString()
  joinDate: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
