import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Payslip, PayslipDocument } from './schemas/payslip.schema.js';
import { CreatePayslipDto } from './dto/createPayslip.dto.js';
import { EmployeeService } from '../employee/employee.service.js';
import { Role } from '../user/user.types.js';
import type { AuthUser } from '../leave/leave.service.js';

@Injectable()
export class PayslipService {
  constructor(
    @InjectModel(Payslip.name) private payslipModel: Model<PayslipDocument>,
    private readonly employeeService: EmployeeService,
  ) {}

  async generatePayslip(dto: CreatePayslipDto) {
    await this.employeeService.getEmployeeById(dto.employeeId);

    const allowances = dto.allowances ?? 0;
    const deductions = dto.deductions ?? 0;
    const netSalary = dto.basicSalary + allowances - deductions;

    try {
      return await this.payslipModel.create({
        employeeId: dto.employeeId,
        month: dto.month,
        year: dto.year,
        basicSalary: dto.basicSalary,
        allowances,
        deductions,
        netSalary,
      });
    } catch (err: unknown) {
      const e = err as { code?: number };
      if (e.code === 11000) {
        throw new ConflictException(
          'A payslip already exists for this employee in the selected period',
        );
      }
      throw err;
    }
  }

  async getPayslips(user: AuthUser, month?: number, year?: number) {
    const filter: Record<string, unknown> = {};
    if (month) filter.month = month;
    if (year) filter.year = year;

    if (user.role !== Role.Admin) {
      const employee = await this.employeeService.getEmployeeByUserId(
        user.sub,
      );
      filter.employeeId = employee._id;
    }

    return await this.payslipModel
      .find(filter)
      .populate('employeeId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPayslipById(id: string, user: AuthUser) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid payslip ID');
    }

    const payslip = await this.payslipModel
      .findById(id)
      .populate('employeeId')
      .exec();

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    if (user.role !== Role.Admin) {
      const employee = await this.employeeService.getEmployeeByUserId(
        user.sub,
      );
      const payslipEmployeeId = (payslip.employeeId as unknown as { _id: unknown })._id ?? payslip.employeeId;
      if (payslipEmployeeId.toString() !== employee._id.toString()) {
        throw new ForbiddenException('You do not own this payslip');
      }
    }

    return payslip;
  }

  async getLatestPayslipForEmployee(employeeId: string) {
    return await this.payslipModel
      .findOne({ employeeId })
      .sort({ year: -1, month: -1 })
      .exec();
  }

  async deletePayslip(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid payslip ID');
    }

    const payslip = await this.payslipModel.findByIdAndDelete(id).exec();
    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    return { message: 'Payslip deleted successfully' };
  }
}
