import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema.js';
import { EmployeeModule } from '../employee/employee.module.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    EmployeeModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AuthGuard, RolesGuard],
  exports: [AttendanceService, MongooseModule],
})
export class AttendanceModule {}
