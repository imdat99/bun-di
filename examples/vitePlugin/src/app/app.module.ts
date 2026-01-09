import { Module } from '@hono-di/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from '../modules/users/users.module';

@Module({
  imports: [
    UsersModule
    // hono-di:imports
  ],
  controllers: [
    AppController, // hono-di:controllers
  ],
  providers: [
    AppService, // hono-di:providers
  ],
})
export class AppModule {}
