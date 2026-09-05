import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { UpdateUserDto } from './dto/updateUser.dto.js';
import { RegisterUserDto } from '../auth/dto/regiterUser.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';

@Controller(['users', 'user'])
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() registerUserDto: RegisterUserDto) {
    return await this.userService.createUser(registerUserDto);
  }

  @Get()
  async getAllUsers() {
    return await this.userService.getAllUsers();
  }

  @Get('me')
  async getMe(@Request() req: { user: { sub: string } }) {
    return await this.userService.getUserById(req.user.sub);
  }

  @Patch('me')
  async updateMe(
    @Request() req: { user: { sub: string } },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const { role: _role, mustChangePassword: _mustChangePassword, ...selfUpdateDto } = updateUserDto;
    return await this.userService.updateUser(req.user.sub, selfUpdateDto);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return await this.userService.getUserById(id);
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.updateUser(id, updateUserDto);
  }

  @Patch(':id')
  async patchUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return await this.userService.deleteUser(id);
  }
}
