import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../user/user.types.js';
import type { AuthUser } from '../leave/leave.service.js';

@Controller('attendance')
@UseGuards(AuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  async checkIn(@Request() req: { user: AuthUser }) {
    return await this.attendanceService.checkIn(req.user);
  }

  @Post('check-out')
  async checkOut(@Request() req: { user: AuthUser }) {
    return await this.attendanceService.checkOut(req.user);
  }

  @Post('away')
  async goAway(@Request() req: { user: AuthUser }) {
    return await this.attendanceService.goAway(req.user);
  }

  @Post('back')
  async comeBack(@Request() req: { user: AuthUser }) {
    return await this.attendanceService.comeBack(req.user);
  }

  @Get('me')
  async getMyAttendance(
    @Request() req: { user: AuthUser },
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return await this.attendanceService.getMyAttendance(
      req.user,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Get()
  @Roles(Role.Admin)
  async getAllAttendance(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return await this.attendanceService.getAllAttendance(
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }
}
