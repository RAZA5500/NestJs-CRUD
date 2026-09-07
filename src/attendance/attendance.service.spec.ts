import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceService } from './attendance.service.js';
import { Attendance } from './schemas/attendance.schema.js';
import { EmployeeService } from '../employee/employee.service.js';
import { DAY_TYPE, MAX_SHIFT_HOURS } from './attendance.types.js';

const HOUR = 60 * 60 * 1000;

describe('AttendanceService', () => {
  let service: AttendanceService;

  const user = { sub: 'user-1', email: 'employee@gmail.com', role: 'EMPLOYEE' };

  /** A record that looks enough like the hydrated document the service saves. */
  const openRecord = (overrides: Record<string, unknown> = {}) => ({
    employeeId: 'employee-1',
    checkIn: new Date(Date.now() - 8 * HOUR),
    checkOut: undefined,
    awayPeriods: [] as { start: Date; end?: Date }[],
    awayHours: 0,
    workingHours: undefined as number | undefined,
    dayType: undefined as string | undefined,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const mockEmployeeService = {
    getEmployeeByUserId: vi.fn().mockResolvedValue({ _id: 'employee-1' }),
  };

  const mockAttendanceModel = {
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    find: vi.fn(),
  };

  const givenTodayRecord = (record: unknown) => {
    mockAttendanceModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(record),
    });
  };

  const givenAbandonedRecords = (records: unknown[]) => {
    mockAttendanceModel.find.mockReturnValue({
      exec: vi.fn().mockResolvedValue(records),
    });
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    givenAbandonedRecords([]);
    mockAttendanceModel.create.mockResolvedValue({});
    mockEmployeeService.getEmployeeByUserId.mockResolvedValue({
      _id: 'employee-1',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getModelToken(Attendance.name),
          useValue: mockAttendanceModel,
        },
        {
          provide: EmployeeService,
          useValue: mockEmployeeService,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('goAway', () => {
    it('opens an away period', async () => {
      const record = openRecord();
      givenTodayRecord(record);

      await service.goAway(user);

      expect(record.awayPeriods).toHaveLength(1);
      expect(record.awayPeriods[0].end).toBeUndefined();
      expect(record.save).toHaveBeenCalled();
    });

    it('refuses to go away twice in a row', async () => {
      givenTodayRecord(
        openRecord({ awayPeriods: [{ start: new Date(Date.now() - HOUR) }] }),
      );

      await expect(service.goAway(user)).rejects.toThrow(BadRequestException);
    });

    it('refuses when the employee has not checked in', async () => {
      givenTodayRecord(null);

      await expect(service.goAway(user)).rejects.toThrow(BadRequestException);
    });

    it('refuses once the employee has checked out', async () => {
      givenTodayRecord(openRecord({ checkOut: new Date() }));

      await expect(service.goAway(user)).rejects.toThrow(BadRequestException);
    });
  });

  describe('comeBack', () => {
    it('closes the open period and banks the away hours', async () => {
      const record = openRecord({
        awayPeriods: [{ start: new Date(Date.now() - 1.5 * HOUR) }],
      });
      givenTodayRecord(record);

      await service.comeBack(user);

      expect(record.awayPeriods[0].end).toBeInstanceOf(Date);
      expect(record.awayHours).toBeCloseTo(1.5, 1);
      expect(record.save).toHaveBeenCalled();
    });

    it('adds up several trips out across the day', async () => {
      const now = Date.now();
      const record = openRecord({
        awayPeriods: [
          { start: new Date(now - 5 * HOUR), end: new Date(now - 4 * HOUR) },
          { start: new Date(now - 0.5 * HOUR) },
        ],
      });
      givenTodayRecord(record);

      await service.comeBack(user);

      expect(record.awayHours).toBeCloseTo(1.5, 1);
    });

    it('refuses when the employee is not away', async () => {
      givenTodayRecord(openRecord());

      await expect(service.comeBack(user)).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkOut', () => {
    it('leaves the total untouched when nobody stepped out', async () => {
      const record = openRecord();
      givenTodayRecord(record);

      await service.checkOut(user);

      expect(record.awayHours).toBe(0);
      expect(record.workingHours).toBeCloseTo(8, 1);
      expect(record.dayType).toBe(DAY_TYPE.FULL);
    });

    it('subtracts finished away periods from the working hours', async () => {
      const now = Date.now();
      const record = openRecord({
        awayPeriods: [
          { start: new Date(now - 5 * HOUR), end: new Date(now - 3 * HOUR) },
        ],
      });
      givenTodayRecord(record);

      await service.checkOut(user);

      expect(record.awayHours).toBeCloseTo(2, 1);
      // 8 hours on site, 2 of them away
      expect(record.workingHours).toBeCloseTo(6, 1);
      expect(record.dayType).toBe(DAY_TYPE.THREE_QUARTER);
    });

    it('ends an away period the employee forgot to close', async () => {
      const record = openRecord({
        awayPeriods: [{ start: new Date(Date.now() - 3 * HOUR) }],
      });
      givenTodayRecord(record);

      await service.checkOut(user);

      expect(record.awayPeriods[0].end).toEqual(record.checkOut);
      expect(record.awayHours).toBeCloseTo(3, 1);
      expect(record.workingHours).toBeCloseTo(5, 1);
    });

    it('never reports negative working hours', async () => {
      const now = Date.now();
      const record = openRecord({
        checkIn: new Date(now - HOUR),
        awayPeriods: [
          { start: new Date(now - 3 * HOUR), end: new Date(now) },
        ],
      });
      givenTodayRecord(record);

      await service.checkOut(user);

      expect(record.workingHours).toBe(0);
    });
  });

  describe('abandoned records', () => {
    /** Yesterday at `hour`, i.e. a day that can no longer be checked out. */
    const yesterdayAt = (hour: number) => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(hour, 0, 0, 0);
      return d;
    };

    const abandoned = (checkIn: Date, awayPeriods: { start: Date; end?: Date }[] = []) =>
      openRecord({ checkIn, awayPeriods, date: new Date(checkIn) });

    it('closes a day the employee checked in for and never came back to', async () => {
      const record = abandoned(yesterdayAt(9));
      givenAbandonedRecords([record]);
      givenTodayRecord(null);

      await service.checkIn(user);

      expect(record.checkOut).toBeInstanceOf(Date);
      expect(record.autoCheckOut).toBe(true);
      expect(record.dayType).toBe(DAY_TYPE.FULL);
      expect(record.save).toHaveBeenCalled();
    });

    it('caps the day at a full shift instead of paying for the night', async () => {
      const record = abandoned(yesterdayAt(9));
      givenAbandonedRecords([record]);
      givenTodayRecord(null);

      await service.checkIn(user);

      expect(record.workingHours).toBeCloseTo(MAX_SHIFT_HOURS, 1);
      expect(record.checkOut.getHours()).toBe(9 + MAX_SHIFT_HOURS);
    });

    it('never runs a capped shift past midnight into the next day', async () => {
      const record = abandoned(yesterdayAt(20));
      givenAbandonedRecords([record]);
      givenTodayRecord(null);

      await service.checkIn(user);

      expect(record.checkOut.getDate()).toBe(yesterdayAt(20).getDate());
      expect(record.workingHours).toBeCloseTo(4, 1);
    });

    it('closes an away period left open on that day too', async () => {
      const checkIn = yesterdayAt(9);
      const record = abandoned(checkIn, [
        { start: new Date(checkIn.getTime() + HOUR) },
      ]);
      givenAbandonedRecords([record]);
      givenTodayRecord(null);

      await service.checkIn(user);

      expect(record.awayPeriods[0].end).toEqual(record.checkOut);
      // away from 10:00 to the capped check-out, so only the first hour counts
      expect(record.workingHours).toBeCloseTo(1, 1);
      expect(record.awayHours).toBeCloseTo(MAX_SHIFT_HOURS - 1, 1);
    });

    it('only ever looks at open records from earlier days', async () => {
      givenTodayRecord(null);

      await service.checkIn(user);

      const filter = mockAttendanceModel.find.mock.calls[0][0];
      expect(filter.checkOut).toEqual({ $exists: false });
      expect(filter.date.$lt.getHours()).toBe(0);
      expect(filter.date.$lt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(filter.employeeId).toBe('employee-1');
    });

    it('is swept before an employee reads their own attendance', async () => {
      const record = abandoned(yesterdayAt(9));
      givenAbandonedRecords([record]);
      mockAttendanceModel.find.mockReturnValueOnce({
        exec: vi.fn().mockResolvedValue([record]),
      });
      mockAttendanceModel.find.mockReturnValueOnce({
        sort: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([record]) }),
      });

      await service.getMyAttendance(user);

      expect(record.autoCheckOut).toBe(true);
      expect(record.checkOut).toBeInstanceOf(Date);
    });
  });
});
