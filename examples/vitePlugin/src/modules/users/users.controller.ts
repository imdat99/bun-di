import { Controller, Get } from '@hono-di/core';

@Controller('users')
export class UsersController {
  constructor() {}

  @Get('/')
  index() {
    return 'Hello Users';
  }
}
