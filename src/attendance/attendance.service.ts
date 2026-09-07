import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema.js';
import { EmployeeService } from '../employee/employee.service.js';
import {
  autoCheckOutTime,
  computeDayType,
  findOpenAwayPeriod,
  roundHours,
  startOfDay,
  sumAwayHours,
} from './attendance.types.js';
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
    await this.closeAbandonedRecords({ employeeId: employee._id });

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

  /** Today's record while the employee is still on the clock. */
  private async getOpenRecordForToday(user: AuthUser) {
    const employee = await this.employeeService.getEmployeeByUserId(user.sub);
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

    return record;
  }

  /**
   * Step out without checking out — a lunch break, an errand. The clock stops
   * here and starts again at `comeBack`; nothing in between is paid time.
   */
  async goAway(user: AuthUser) {
    const record = await this.getOpenRecordForToday(user);

    if (findOpenAwayPeriod(record.awayPeriods)) {
      throw new BadRequestException('You are already marked as away');
    }

    record.awayPeriods.push({ start: new Date() });
    await record.save();

    return record;
  }

  /** Back at work: closes the open away period and banks the excluded time. */
  async comeBack(user: AuthUser) {
    const record = await this.getOpenRecordForToday(user);

    const openPeriod = findOpenAwayPeriod(record.awayPeriods);
    if (!openPeriod) {
      throw new BadRequestException('You are not marked as away');
    }

    openPeriod.end = new Date();
    record.awayHours = roundHours(sumAwayHours(record.awayPeriods));
    await record.save();

    return record;
  }

  /**
   * Closes off a day: any open away period ends here, and the hours are what
   * is left of the time on site once the away time is taken out.
   */
  private closeRecord(
    record: AttendanceDocument,
    checkOut: Date,
    { auto = false } = {},
  ) {
    // Checking out while still marked away ends the break there, so someone who
    // forgets to come back is not paid for the time they were gone.
    const openPeriod = findOpenAwayPeriod(record.awayPeriods);
    if (openPeriod) {
      openPeriod.end = checkOut;
    }

    const awayHours = sumAwayHours(record.awayPeriods, checkOut);
    const hoursOnSite =
      (checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);
    const workingHours = Math.max(0, hoursOnSite - awayHours);

    record.checkOut = checkOut;
    record.awayHours = roundHours(awayHours);
    record.workingHours = roundHours(workingHours);
    record.dayType = computeDayType(workingHours);
    record.autoCheckOut = auto;

    return record.save();
  }

  /**
   * Days an employee checked in for and then simply left — closed the tab, went
   * home, never checked out. Left alone the record stays open forever: its
   * hours keep ticking up and it can never be checked out, because check-out
   * only ever looks at today. So each one is closed at the end of its own
   * shift and flagged, rather than being paid through the night.
   *
   * Runs on read and on the next check-in, which is often enough to keep the
   * data honest without a scheduled job.
   */
  private async closeAbandonedRecords(
    filter: QueryFilter<AttendanceDocument> = {},
  ) {
    const abandoned = await this.attendanceModel
      .find({
        ...filter,
        date: { $lt: startOfDay(new Date()) },
        checkOut: { $exists: false },
      })
      .exec();

    await Promise.all(
      abandoned.map((record) =>
        this.closeRecord(record, autoCheckOutTime(record.checkIn), {
          auto: true,
        }),
      ),
    );
  }

  async checkOut(user: AuthUser) {
    const record = await this.getOpenRecordForToday(user);

    await this.closeRecord(record, new Date());

    return record;
  }

  async getMyAttendance(user: AuthUser, month?: number, year?: number) {
    const employee = await this.employeeService.getEmployeeByUserId(
      user.sub,
    );
    await this.closeAbandonedRecords({ employeeId: employee._id });

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
    await this.closeAbandonedRecords();

    const dateRange = this.monthRange(month, year);

    return await this.attendanceModel
      .find(dateRange ? { date: dateRange } : {})
      .populate('employeeId')
      .sort({ date: -1 })
      .exec();
  }
}
