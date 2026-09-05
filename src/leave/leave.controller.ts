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
import { LeaveService, AuthUser } from './leave.service.js';
import { CreateLeaveDto } from './dto/createLeave.dto.js';
import { UpdateLeaveDto } from './dto/updateLeave.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';

@Controller('leaves')
@UseGuards(AuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  async createLeave(
    @Request() req: { user: AuthUser },
    @Body() dto: CreateLeaveDto,
  ) {
    return await this.leaveService.createLeave(req.user, dto);
  }

  @Get()
  async getLeaves(
    @Request() req: { user: AuthUser },
    @Query('status') status?: string,
  ) {
    return await this.leaveService.getLeaves(req.user, status);
  }

  @Patch(':id')
  async updateLeave(
    @Param('id') id: string,
    @Request() req: { user: AuthUser },
    @Body() dto: UpdateLeaveDto,
  ) {
    return await this.leaveService.updateLeave(id, req.user, dto);
  }

  @Delete(':id')
  async deleteLeave(
    @Param('id') id: string,
    @Request() req: { user: AuthUser },
  ) {
    return await this.leaveService.deleteLeave(id, req.user);
  }
}
