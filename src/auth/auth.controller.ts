import { Controller, UseGuards, Post, Res, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Response } from 'express';
import { CurrentUser } from './current-user.decorator';
import * as schema from '../users/schema';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(
    @CurrentUser() user: typeof schema.users.$inferSelect,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.login(user, response);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshAuthGuard)
  async refresh(
    @CurrentUser() user: typeof schema.users.$inferSelect,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.login(user, response);
  }

  // initial google auth
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  loginGoogle() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async loginGoogleCallback(
    @CurrentUser() user: typeof schema.users.$inferSelect,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.login(user, response, true);
  }

  @Post('signout')
  @UseGuards(JwtAuthGuard)
  async signOut(
    @CurrentUser() user: typeof schema.users.$inferSelect,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.signOut(user.id, response);
  }
}
