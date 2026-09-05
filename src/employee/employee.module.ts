import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeService } from './employee.service.js';
import { EmployeeController } from './employee.controller.js';
import { Employee, EmployeeSchema } from './schemas/employee.schema.js';
import { Leave, LeaveSchema } from '../leave/schemas/leave.schema.js';
import { Payslip, PayslipSchema } from '../payslip/schemas/payslip.schema.js';
import { Attendance, AttendanceSchema } from '../attendance/schemas/attendance.schema.js';
import { UserModule } from '../user/user.module.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Leave.name, schema: LeaveSchema },
      { name: Payslip.name, schema: PayslipSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    UserModule,
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService, AuthGuard, RolesGuard],
  exports: [EmployeeService, MongooseModule],
})
export class EmployeeModule {}
