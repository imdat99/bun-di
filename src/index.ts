import 'reflect-metadata';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './config/env';
import { BunDIFactory } from './core/factory';
import { AppModule } from './AppModule';

// Register all dependencies in the DI container
// registerDependencies();

// Get logger instance for startup messages
// const appLogger = container.resolve(LoggerService);

const app = new Hono();

// Middleware
app.use(logger(), cors());

// Bootstrap the application
BunDIFactory.create(AppModule, app);

console.log(`🚀 Server is running on http://localhost:${env.PORT}`);
console.log(`📝 Environment: ${env.NODE_ENV}`);
console.log(`✅ Hono + NestJS-like Architecture configured`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};