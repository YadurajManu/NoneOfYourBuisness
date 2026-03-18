import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  Get,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../types/jwt.types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const result = await this.authService.login(user, this.requestMeta(req));
    this.setRefreshCookie(res, result.refresh_token);

    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(
      body.orgName,
      body.email,
      body.password,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, result.refresh_token);

    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.extractRefreshToken(req);
    const result = await this.authService.refresh(token, this.requestMeta(req));
    this.setRefreshCookie(res, result.refresh_token);

    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.ml_refresh_token as string | undefined;
    if (token) {
      await this.authService.logout(token);
    }
    this.clearRefreshCookie(res);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: AuthenticatedUser }) {
    return this.authService.getMe(req.user.userId);
  }

  private requestMeta(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      deviceInfo:
        typeof req.headers['sec-ch-ua-platform'] === 'string'
          ? req.headers['sec-ch-ua-platform']
          : undefined,
    };
  }

  private extractRefreshToken(req: Request): string {
    const token = req.cookies?.ml_refresh_token as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    return token;
  }

  private setRefreshCookie(res: Response, token: string) {
    const sameSiteEnv = (
      process.env.COOKIE_SAME_SITE ?? 'lax'
    ).toLowerCase() as 'lax' | 'strict' | 'none';
    const secureCookie =
      process.env.NODE_ENV === 'production' || sameSiteEnv === 'none';
    const cookieDomain = process.env.COOKIE_DOMAIN;

    res.cookie('ml_refresh_token', token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: sameSiteEnv,
      domain: cookieDomain || undefined,
      path: '/api/auth',
      maxAge: this.authService.getRefreshTokenMaxAgeMs(),
    });
  }

  private clearRefreshCookie(res: Response) {
    const cookieDomain = process.env.COOKIE_DOMAIN;
    res.clearCookie('ml_refresh_token', {
      path: '/api/auth',
      domain: cookieDomain || undefined,
    });
  }
}
