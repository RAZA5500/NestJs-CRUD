import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterUserDto } from './dto/regiterUser.dto.js';
import { LoginUserDto } from './dto/loginUser.dto.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }
    
    @Post('register')
    async register(@Body() registerUserDto: RegisterUserDto) {
       const userReg = await this.authService.registerUser(registerUserDto)
        return userReg;
    }

    @Post('login')
    async login(@Body() loginUserDto: LoginUserDto) {
        const userLog = await this.authService.loginUser(loginUserDto)
        return userLog;
    }
}
