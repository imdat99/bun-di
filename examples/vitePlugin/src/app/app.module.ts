import { Module } from '@hono-di/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
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
