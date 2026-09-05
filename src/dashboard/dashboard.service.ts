import { Injectable } from '@nestjs/common';
import { EmployeeService } from '../employee/employee.service.js';
import { LeaveService, AuthUser } from '../leave/leave.service.js';
import { PayslipService } from '../payslip/payslip.service.js';
import { AttendanceService } from '../attendance/attendance.service.js';
import { Role } from '../user/user.types.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly leaveService: LeaveService,
    private readonly payslipService: PayslipService,
    private readonly attendanceService: AttendanceService,
  ) {}

  async getDashboard(user: AuthUser) {
    if (user.role === Role.Admin) {
      const [totalEmployees, totalDepartments, todayAttendance, pendingLeaves] =
        await Promise.all([
          this.employeeService.countEmployees(),
          this.employeeService.countDistinctDepartments(),
          this.attendanceService.countToday(),
          this.leaveService.countPendingLeaves(),
        ]);

      return {
        role: Role.Admin,
        totalEmployees,
        totalDepartments,
        todayAttendance,
        pendingLeaves,
      };
    }

    const employee = await this.employeeService.getEmployeeByUserId(
      user.sub,
    );
    const now = new Date();

    const [currentMonthAttendance, pendingLeaves, latestPayslip] =
      await Promise.all([
        this.attendanceService.countForEmployeeInMonth(
          employee._id.toString(),
          now.getMonth() + 1,
          now.getFullYear(),
        ),
        this.leaveService.countPendingLeaves(employee._id.toString()),
        this.payslipService.getLatestPayslipForEmployee(
          employee._id.toString(),
        ),
      ]);

    return {
      role: Role.Employee,
      currentMonthAttendance,
      pendingLeaves,
      latestPayslip: latestPayslip ? { netSalary: latestPayslip.netSalary } : null,
      employee: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        department: employee.department,
      },
    };
  }
}
