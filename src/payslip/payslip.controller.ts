import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PayslipService } from './payslip.service.js';
import { CreatePayslipDto } from './dto/createPayslip.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../user/user.types.js';
import type { AuthUser } from '../leave/leave.service.js';

@Controller('payslips')
@UseGuards(AuthGuard, RolesGuard)
export class PayslipController {
  constructor(private readonly payslipService: PayslipService) {}

  @Post()
  @Roles(Role.Admin)
  async generatePayslip(@Body() dto: CreatePayslipDto) {
    return await this.payslipService.generatePayslip(dto);
  }

  @Get()
  async getPayslips(
    @Request() req: { user: AuthUser },
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return await this.payslipService.getPayslips(
      req.user,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Get(':id')
  async getPayslipById(
    @Param('id') id: string,
    @Request() req: { user: AuthUser },
  ) {
    return await this.payslipService.getPayslipById(id, req.user);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  async deletePayslip(@Param('id') id: string) {
    return await this.payslipService.deletePayslip(id);
  }
}
