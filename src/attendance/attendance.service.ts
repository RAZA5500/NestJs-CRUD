import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema.js';
import { EmployeeService } from '../employee/employee.service.js';
import { computeDayType, startOfDay } from './attendance.types.js';
import type { AuthUser } from '../leave/leave.service.js';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    private readonly employeeService: EmployeeService,
  ) {}

  private monthRange(month?: number, year?: number) {
    if (!month || !year) return null;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return { $gte: start, $lt: end };
  }

  async checkIn(user: AuthUser) {
    const employee = await this.employeeService.getEmployeeByUserId(
      user.sub,
    );
    const today = startOfDay(new Date());

    const existing = await this.attendanceModel
      .findOne({ employeeId: employee._id, date: today })
      .exec();
    if (existing) {
      throw new BadRequestException('Already checked in today');
    }

    return await this.attendanceModel.create({
      employeeId: employee._id,
      date: today,
      checkIn: new Date(),
    });
  }

  async checkOut(user: AuthUser) {
    const employee = await this.employeeService.getEmployeeByUserId(
      user.sub,
    );
    const today = startOfDay(new Date());

    const record = await this.attendanceModel
      .findOne({ employeeId: employee._id, date: today })
      .exec();
    if (!record) {
      throw new BadRequestException('You have not checked in today');
    }
    if (record.checkOut) {
      throw new BadRequestException('Already checked out today');
    }

    const checkOut = new Date();
    const workingHours =
      (checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);

    record.checkOut = checkOut;
    record.workingHours = Math.round(workingHours * 100) / 100;
    record.dayType = computeDayType(workingHours);
    await record.save();

    return record;
  }

  async getMyAttendance(user: AuthUser, month?: number, year?: number) {
    const employee = await this.employeeService.getEmployeeByUserId(
      user.sub,
    );
    const dateRange = this.monthRange(month, year);

    return await this.attendanceModel
      .find({
        employeeId: employee._id,
        ...(dateRange ? { date: dateRange } : {}),
      })
      .sort({ date: -1 })
      .exec();
  }

  async countToday() {
    const today = startOfDay(new Date());
    return await this.attendanceModel.countDocuments({ date: today }).exec();
  }

  async countForEmployeeInMonth(
    employeeId: string,
    month: number,
    year: number,
  ) {
    const dateRange = this.monthRange(month, year);
    return await this.attendanceModel
      .countDocuments({ employeeId, date: dateRange })
      .exec();
  }

  async getAllAttendance(month?: number, year?: number) {
    const dateRange = this.monthRange(month, year);

    return await this.attendanceModel
      .find(dateRange ? { date: dateRange } : {})
      .populate('employeeId')
      .sort({ date: -1 })
      .exec();
  }
}
