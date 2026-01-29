import {
  Body,
  Controller,
  Post,
  Res,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import express from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { cookieConfig } from '../../../config/cookie.config';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  async requestOtp(@Body('email') email: string) {
    return this.authService.requestOtp(email);
  }

  @Post('resend-otp')
  async resendOtp(@Body('email') email: string) {
    return this.authService.resendOtp(email);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() dto: { email: string; otp: string }) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const user = await this.authService.register(body);
    return {
      statusCode: 201,
      message: 'Đăng ký thành công',
      data: {
        id: user.id,
        email: user.email,
      },
    };
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(
      body.email,
      body.password,
    );

    res.cookie('access_token', accessToken, {
      ...cookieConfig,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieConfig,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return {
      statusCode: 200,
      message: 'Đăng nhập thành công',
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  @Post('refresh')
  async refresh(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    const {
      user,
      accessToken,
      refreshToken: newRt,
    } = await this.authService.refresh(refreshToken);

    res.cookie('access_token', accessToken, {
      ...cookieConfig,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', newRt, {
      ...cookieConfig,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return {
      statusCode: 200,
      message: 'Refresh token thành công',
      data: {
        id: user.id,
        email: user.email,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    await this.authService.logout(user.sub);
    res.clearCookie('access_token', cookieConfig);
    res.clearCookie('refresh_token', cookieConfig);
    return {
      statusCode: 200,
      message: 'Đăng xuất thành công',
      data: null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: any) {
    return {
      id: user.sub,
      email: user.email,
      roles: user.roles,
    };
  }
}
