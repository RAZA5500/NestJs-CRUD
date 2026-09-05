import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { LeaveStatus, LeaveType } from '../leave.types.js';

export class UpdateLeaveDto {
  @IsOptional()
  @IsIn(Object.values(LeaveType))
  type?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsIn(Object.values(LeaveStatus))
  status?: string;
}
