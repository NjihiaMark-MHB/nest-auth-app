import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { compare, hash } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import * as schema from '../users/schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    user: typeof schema.users.$inferSelect,
    response: Response,
    redirect = false,
  ) {
    try {
      const expirationMs = parseInt(
        this.configService.getOrThrow('JWT_ACCESS_TOKEN_EXPIRATION_MS'),
      );
      const refreshExpirationMs = parseInt(
        this.configService.getOrThrow('JWT_REFRESH_TOKEN_EXPIRATION_MS'),
      );

      const expiresAccessToken = new Date(Date.now() + expirationMs);
      const expiresRefreshToken = new Date(Date.now() + refreshExpirationMs);

      const tokenPayload = {
        userId: user.id,
      };

      const accessToken = this.jwtService.sign(tokenPayload, {
        secret: this.configService.getOrThrow('JWT_ACCESS_TOKEN_SECRET'),
        expiresIn: `${this.configService.getOrThrow(
          'JWT_ACCESS_TOKEN_EXPIRATION_MS',
        )}ms`,
      });

      const refreshToken = this.jwtService.sign(tokenPayload, {
        secret: this.configService.getOrThrow('JWT_REFRESH_TOKEN_SECRET'),
        expiresIn: `${this.configService.getOrThrow(
          'JWT_REFRESH_TOKEN_EXPIRATION_MS',
        )}ms`,
      });

      const userData = {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.userAvatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      await this.usersService.updateUser(user.id, {
        refreshToken: await hash(refreshToken, 10),
      });

      response.cookie('Authentication', accessToken, {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        expires: expiresAccessToken,
      });

      response.cookie('Refresh', refreshToken, {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        expires: expiresRefreshToken,
      });
      if (redirect) {
        const redirectUrl = new URL(
          this.configService.getOrThrow('AUTH_UI_REDIRECT'),
        );
        redirectUrl.searchParams.append('userId', user.uuid);
        return response.redirect(redirectUrl.toString());
      }

      return response.json(userData);
    } catch (error) {
      this.logger.error('Login error:', {
        error: error.message,
        userId: user.id,
        stack: error.stack,
      });
      throw new UnauthorizedException(
        'Failed to process login. Please try again.',
      );
    }
  }

  async verifyUserRefreshToken(
    refreshToken: string,
    userId: number,
  ): Promise<Omit<typeof schema.users.$inferSelect, 'password'>> {
    try {
      const user = await this.usersService.getUserById(userId);
      const refreshTokenMatches = await compare(
        refreshToken,
        user.refreshToken,
      );
      if (!refreshTokenMatches) {
        throw new UnauthorizedException();
      }
      return user;
    } catch (error) {
      this.logger.error('Verify user refresh token error', error);
      throw new UnauthorizedException('Refresh token is not valid');
    }
  }

  async verifyUser(email: string, password: string) {
    try {
      const user = await this.usersService.getUserByEmail(email);
      const authenticated = await compare(password, user.password);
      if (!authenticated) {
        throw new UnauthorizedException();
      }
      return user;
    } catch (error) {
      this.logger.error('Verify user error', error);
      throw new UnauthorizedException('Credentials are not valid');
    }
  }

  async signOut(userId: number, response: Response) {
    try {
      await this.usersService.updateUser(userId, { refreshToken: null });
      response.clearCookie('Authentication');
      response.clearCookie('Refresh');
      response.status(200).json({ message: 'Successfully signed out' });
    } catch (error) {
      this.logger.error('Sign out error:', {
        error: error.message,
        userId,
        stack: error.stack,
      });
      throw new UnauthorizedException('Failed to process sign out');
    }
  }
}
