import 'reflect-metadata';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './config/env';
import { HonoDiFactory } from 'hono-di';
import { AppModule } from './AppModule';
import { showRoutes } from 'hono/dev';

// Register all dependencies in the DI container
// registerDependencies();

// Get logger instance for startup messages
// const appLogger = container.resolve(LoggerService);

// const app = new Hono()

// Middleware
// app.use(logger(), cors());
// Bootstrap the application
const honoApp = new Hono()
const app = await HonoDiFactory.create(AppModule, honoApp);
// const app = await HonoDiFactory.create(AppModule, { app: honoApp, autoInit: false });
app.setGlobalPrefix('/api');
await app.init();
// showRoutes(app);

console.log(`🚀 Server is running on http://localhost:${env.PORT}`);
console.log(`📝 Environment: ${env.NODE_ENV}`);
console.log(`✅ Hono + NestJS-like Architecture configured`);

export default {
  port: env.PORT,
  fetch: honoApp.fetch,
};