import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Leave, LeaveDocument } from './schemas/leave.schema.js';
import { CreateLeaveDto } from './dto/createLeave.dto.js';
import { UpdateLeaveDto } from './dto/updateLeave.dto.js';
import { EmployeeService } from '../employee/employee.service.js';
import { LeaveStatus } from './leave.types.js';
import { Role } from '../user/user.types.js';

export interface AuthUser {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class LeaveService {
  constructor(
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
    private readonly employeeService: EmployeeService,
  ) {}

  async createLeave(user: AuthUser, dto: CreateLeaveDto) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const employee = await this.employeeService.getEmployeeByUserId(user.sub);

    return await this.leaveModel.create({
      employeeId: employee._id,
      type: dto.type,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      status: LeaveStatus.Pending,
    });
  }

  async getLeaves(user: AuthUser, status?: string) {
    const filter: Record<string, unknown> = status ? { status } : {};

    if (user.role !== Role.Admin) {
      const employee = await this.employeeService.getEmployeeByUserId(
        user.sub,
      );
      filter.employeeId = employee._id;
    }

    return await this.leaveModel
      .find(filter)
      .populate('employeeId')
      .sort({ createdAt: -1 })
      .exec();
  }

  private async getOwnedLeave(id: string, user: AuthUser) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid leave ID');
    }

    const leave = await this.leaveModel.findById(id).exec();
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (user.role !== Role.Admin) {
      const employee = await this.employeeService.getEmployeeByUserId(
        user.sub,
      );
      if (leave.employeeId.toString() !== employee._id.toString()) {
        throw new ForbiddenException('You do not own this leave request');
      }
    }

    return leave;
  }

  async updateLeave(id: string, user: AuthUser, dto: UpdateLeaveDto) {
    const leave = await this.getOwnedLeave(id, user);

    if (user.role === Role.Admin) {
      Object.assign(leave, dto);
    } else {
      if (leave.status !== LeaveStatus.Pending) {
        throw new BadRequestException(
          'Only pending leave requests can be edited',
        );
      }
      const { status: _status, ...ownUpdate } = dto;
      Object.assign(leave, ownUpdate);
    }

    await leave.save();
    return leave;
  }

  async countPendingLeaves(employeeId?: string) {
    const filter: Record<string, unknown> = { status: LeaveStatus.Pending };
    if (employeeId) filter.employeeId = employeeId;
    return await this.leaveModel.countDocuments(filter).exec();
  }

  async deleteLeave(id: string, user: AuthUser) {
    const leave = await this.getOwnedLeave(id, user);
    await leave.deleteOne();
    return { message: 'Leave request deleted successfully' };
  }
}
