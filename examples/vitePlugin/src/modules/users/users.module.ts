import { Module } from '@hono-di/core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    // hono-di:imports
  ],
  controllers: [
    UsersController, // hono-di:controllers
  ],
  providers: [
    UsersService, // hono-di:providers
  ],
})
export class UsersModule {}
