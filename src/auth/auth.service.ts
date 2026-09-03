import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service.js';
import { RegisterUserDto } from './dto/regiterUser.dto.js';
import bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/loginUser.dto.js';
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(registerUserDto: RegisterUserDto) {
    const { fName, lName, email, password } = registerUserDto;

    if (!fName || !lName || !email || !password) {
      throw new BadRequestException(
        'Must fill the required fields (fName, lName, email, & password)',
      );
    }

    const saltRounds = 10;
    const hashPwd = await bcrypt.hash(password, saltRounds);

    const user = await this.userService.createUser({
      ...registerUserDto,
      password: hashPwd,
    });

    return {
      id: user._id,
      firstName: fName,
      lastName: lName,
      email: user.email,
      password: user.password,
      message: 'Signup succesfull',
    };
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.userService.loginUser({
      email,
      password: ''
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      message: 'Login successfully',
    };
  }
}
