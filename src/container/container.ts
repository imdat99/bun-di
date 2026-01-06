import 'reflect-metadata';
import { container } from 'tsyringe';

// Services
import { LoggerService } from '../services/LoggerService';
import { UserService } from '../services/UserService';
import { ProductService } from '../services/ProductService';

// Repositories
import { UserRepository } from '../repositories/UserRepository';
import { ProductRepository } from '../repositories/ProductRepository';

/**
 * Register all dependencies in the DI container
 * This is where you configure the lifecycle of your services
 */
export function registerDependencies(): void {
  // Dependencies are automatically registered via @singleton() decorator
}

/**
 * Get the DI container
 */
export function getContainer() {
  return container;
}
