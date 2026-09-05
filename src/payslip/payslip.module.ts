import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayslipService } from './payslip.service.js';
import { PayslipController } from './payslip.controller.js';
import { Payslip, PayslipSchema } from './schemas/payslip.schema.js';
import { EmployeeModule } from '../employee/employee.module.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payslip.name, schema: PayslipSchema }]),
    EmployeeModule,
  ],
  controllers: [PayslipController],
  providers: [PayslipService, AuthGuard, RolesGuard],
  exports: [PayslipService, MongooseModule],
})
export class PayslipModule {}
