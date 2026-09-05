import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaveService } from './leave.service.js';
import { LeaveController } from './leave.controller.js';
import { Leave, LeaveSchema } from './schemas/leave.schema.js';
import { EmployeeModule } from '../employee/employee.module.js';
import { AuthGuard } from '../auth/auth.guard.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Leave.name, schema: LeaveSchema }]),
    EmployeeModule,
  ],
  controllers: [LeaveController],
  providers: [LeaveService, AuthGuard],
  exports: [LeaveService, MongooseModule],
})
export class LeaveModule {}
