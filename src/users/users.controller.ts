import { Body, Controller, Post, Get, UseGuards, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto/create-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() request: CreateUserDto) {
    return this.usersService.createUser(request);
  }

  @Get('uuid/:uuid')
  @UseGuards(JwtAuthGuard)
  async getUserbyUUID(@Param('uuid') userId: string) {
    return this.usersService.getUserByUUId(userId);
  }
}
