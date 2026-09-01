import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service.js';
import { RegisterUserDto } from './dto/regiterUser.dto.js';
import bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async registerUser(registerUserDto: RegisterUserDto) {
    const { fName, lName, email, password } = registerUserDto;

    if (!email || !password || !fName || !lName) {
      throw new BadRequestException('All fields (fName, lName, email, password) are required');
    }

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = 10;
    const hashPwd = await bcrypt.hash(password, saltRounds);

    const user = await this.userService.createUser({
      ...registerUserDto,
      password: hashPwd,
    });

    return {
      message: 'User registered successfully',
      user: {
        id: user._id,
        fName: user.fName,
        lName: user.lName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
