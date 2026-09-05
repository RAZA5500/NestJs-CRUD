import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Employee, EmployeeDocument } from './schemas/employee.schema.js';
import { Leave, LeaveDocument } from '../leave/schemas/leave.schema.js';
import { Payslip, PayslipDocument } from '../payslip/schemas/payslip.schema.js';
import { Attendance, AttendanceDocument } from '../attendance/schemas/attendance.schema.js';
import { CreateEmployeeDto } from './dto/createEmployee.dto.js';
import { UpdateEmployeeDto } from './dto/updateEmployee.dto.js';
import { UserService } from '../user/user.service.js';
import { Role } from '../user/user.types.js';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
    @InjectModel(Payslip.name) private payslipModel: Model<PayslipDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    private readonly userService: UserService,
  ) {}

  async createEmployee(dto: CreateEmployeeDto) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.userService.createUser({
      fName: dto.firstName,
      lName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: Role.Employee,
      mustChangePassword: true,
    });

    try {
      return await this.employeeModel.create({
        userId: user._id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        department: dto.department,
        position: dto.position,
        basicSalary: dto.basicSalary,
        allowances: dto.allowances ?? 0,
        deductions: dto.deductions ?? 0,
        employmentStatus: dto.employmentStatus,
        joinDate: dto.joinDate,
        bio: dto.bio ?? '',
      });
    } catch (err: unknown) {
      await this.userService.deleteUser(user._id.toString()).catch(() => {});

      const e = err as { code?: number };
      if (e.code === 11000) {
        throw new ConflictException(
          'Employee with this email already exists',
        );
      }
      throw err;
    }
  }

  async getAllEmployees(department?: string) {
    const filter = department ? { department } : {};
    return await this.employeeModel
      .find(filter)
      .populate('userId', 'email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getEmployeeById(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid employee ID');
    }

    const employee = await this.employeeModel
      .findById(id)
      .populate('userId', 'email role')
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async getEmployeeByUserId(userId: string) {
    const employee = await this.employeeModel
      .findOne({ userId })
      .populate('userId', 'email role')
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee profile not found');
    }

    return employee;
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid employee ID');
    }

    const employee = await this.employeeModel.findById(id).exec();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    try {
      if (dto.email && dto.email !== employee.email) {
        await this.userService.updateUser(employee.userId.toString(), {
          email: dto.email,
        });
      }

      Object.assign(employee, dto);
      await employee.save();
      return employee;
    } catch (err: unknown) {
      const e = err as { code?: number };
      if (e.code === 11000) {
        throw new ConflictException(
          'Employee with this email already exists',
        );
      }
      throw err;
    }
  }

  async countEmployees() {
    return await this.employeeModel.countDocuments().exec();
  }

  async countDistinctDepartments() {
    const departments = await this.employeeModel.distinct('department').exec();
    return departments.length;
  }

  async deleteEmployee(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid employee ID');
    }

    const employee = await this.employeeModel.findByIdAndDelete(id).exec();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    await Promise.all([
      this.userService.deleteUser(employee.userId.toString()).catch(() => {}),
      this.leaveModel.deleteMany({ employeeId: employee._id }).exec(),
      this.payslipModel.deleteMany({ employeeId: employee._id }).exec(),
      this.attendanceModel.deleteMany({ employeeId: employee._id }).exec(),
    ]);

    return { message: 'Employee deleted successfully' };
  }
}
