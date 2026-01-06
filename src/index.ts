import 'reflect-metadata';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { container } from 'tsyringe';
import { registerDependencies } from './container/container';
import { appRouter } from './trpc/routers/appRouter';
import { createContext } from './trpc/context';
import { LoggerService } from './services/LoggerService';
import { env } from './config/env';

// Register all dependencies in the DI container
registerDependencies();

// Get logger instance for startup messages
const appLogger = container.resolve(LoggerService);

const app = new Hono();

// Middleware
app.use(logger(), cors());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// tRPC Handler
app.all('/trpc/*', (c) => {
  return fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

appLogger.info(`🚀 Server is running on http://localhost:${env.PORT}`);
appLogger.info(`📝 Environment: ${env.NODE_ENV}`);
appLogger.info(`✅ Hono + tRPC Adapter configured`);
appLogger.info(`🔗 tRPC Endpoint: http://localhost:${env.PORT}/trpc`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};