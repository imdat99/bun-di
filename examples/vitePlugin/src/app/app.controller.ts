import { Controller, Get } from '@hono-di/core';

@Controller('app')
export class AppController {
  constructor() {}

  @Get('/')
  index() {
    return 'Hello App';
  }
}
