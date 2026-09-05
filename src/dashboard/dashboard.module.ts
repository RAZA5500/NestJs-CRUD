import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { DashboardController } from './dashboard.controller.js';
import { EmployeeModule } from '../employee/employee.module.js';
import { LeaveModule } from '../leave/leave.module.js';
import { PayslipModule } from '../payslip/payslip.module.js';
import { AttendanceModule } from '../attendance/attendance.module.js';
import { AuthGuard } from '../auth/auth.guard.js';

@Module({
  imports: [EmployeeModule, LeaveModule, PayslipModule, AttendanceModule],
  controllers: [DashboardController],
  providers: [DashboardService, AuthGuard],
})
export class DashboardModule {}
