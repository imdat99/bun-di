/**
 * @module @hono-di/core
 * Main entry point for Hono DI framework
 */

// Core decorators and metadata
export * from './decorators';
export { METADATA_KEYS } from './constants';

// DI System
export * from './interfaces';
export * from './factory';
export * from './scanner';
export * from './injector/container';
export * from './injector/module-ref';
export * from './application';

// Utilities & Builders
export * from './utils';
export * from './execution-context-host';
export * from './middleware/builder';

// Services
export * from './services/logger.service';
export * from './services/reflector.service';

// Common (Exceptions, Pipes, Filters)
export * from './common/exceptions';
export * from './common/pipes';
export * from './common/errors/AppError';
export * from './common/interfaces/ILogger';
export * from './common/filters/BaseExceptionFilter';

// Convenience alias
import { HonoDiFactory } from './factory';
export const HonoDi = HonoDiFactory;
