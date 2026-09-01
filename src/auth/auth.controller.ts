import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterUserDto } from './dto/regiterUser.dto.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }
    
    @Post('register')
    async register(@Body() registerUserDto: RegisterUserDto) {
       const result = await this.authService.registerUser(registerUserDto)
        return result
    }
}
