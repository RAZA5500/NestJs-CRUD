import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EmployeeService } from './employee.service.js';
import { CreateEmployeeDto } from './dto/createEmployee.dto.js';
import { UpdateEmployeeDto } from './dto/updateEmployee.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../user/user.types.js';

@Controller('employees')
@UseGuards(AuthGuard, RolesGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @Roles(Role.Admin)
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    return await this.employeeService.createEmployee(dto);
  }

  @Get()
  @Roles(Role.Admin)
  async getAllEmployees(@Query('department') department?: string) {
    return await this.employeeService.getAllEmployees(department);
  }

  @Get('me')
  async getMyProfile(@Request() req: { user: { sub: string } }) {
    return await this.employeeService.getEmployeeByUserId(req.user.sub);
  }

  @Get(':id')
  @Roles(Role.Admin)
  async getEmployeeById(@Param('id') id: string) {
    return await this.employeeService.getEmployeeById(id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return await this.employeeService.updateEmployee(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  async deleteEmployee(@Param('id') id: string) {
    return await this.employeeService.deleteEmployee(id);
  }
}
