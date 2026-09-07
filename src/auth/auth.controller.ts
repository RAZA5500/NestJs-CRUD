import { Body, Controller, Get, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterUserDto } from './dto/regiterUser.dto.js';
import { LoginUserDto } from './dto/loginUser.dto.js';
import { RefreshTokenDto } from './dto/refreshToken.dto.js';
import { AuthGuard } from './auth.guard.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }
    
    @Post('register')
    async register(@Body() registerUserDto: RegisterUserDto) {
       const userReg = await this.authService.registerUser(registerUserDto)
        return userReg;
    }

    @Post('login')
    @HttpCode(200)
    async login(@Body() loginUserDto: LoginUserDto) {
        const userLog = await this.authService.loginUser(loginUserDto)
        return userLog;
    }

    // Deliberately unguarded: the expired access token cannot authorise this
    // call, holding a valid refresh token is what proves the session.
    @Post('refresh')
    @HttpCode(200)
    async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
        return await this.authService.refreshTokens(refreshTokenDto.refresh_token);
    }

    @Post('logout')
    @HttpCode(200)
    async logout(@Body() refreshTokenDto: RefreshTokenDto) {
        return await this.authService.logout(refreshTokenDto.refresh_token);
    }

    @UseGuards(AuthGuard)
    @Get('profile')
    getProfile(@Request() req: { user: { sub: string; email: string } }) {
        return req.user;
    }
}
