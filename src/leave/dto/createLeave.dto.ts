import { IsDateString, IsIn, IsString } from 'class-validator';
import { LeaveType } from '../leave.types.js';

export class CreateLeaveDto {
  @IsIn(Object.values(LeaveType))
  type: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  reason: string;
}
