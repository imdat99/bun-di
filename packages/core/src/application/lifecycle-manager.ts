import { Container } from '../injector/container';
import { Logger } from '../services/logger.service';

/**
 * Manages application lifecycle hooks
 * 
 * @remarks
 * Executes lifecycle hooks on all modules and providers:
 * - OnModuleInit
 * - OnApplicationBootstrap
 * - OnApplicationShutdown
 * - beforeApplicationShutdown
 * 
 * @internal
 */
export class LifecycleManager {
    private readonly logger = new Logger('LifecycleManager');

    /**
     * Calls a lifecycle hook on all providers/controllers in all modules
     * 
     * @param hookName - Name of the lifecycle method to call
     * @param container - DI container with all modules
     */
    async callHook(hookName: string, container: Container): Promise<void> {
        const modules = container.getModules();
        
        for (const module of modules.values()) {
            // Call on providers
            for (const wrapper of module.providers.values()) {
                const instance = wrapper.instance;
                if (instance && typeof (instance as any)[hookName] === 'function') {
                    await (instance as any)[hookName]();
                }
            }

            // Call on controllers
            for (const wrapper of module.controllers.values()) {
                const instance = wrapper.instance;
                if (instance && typeof (instance as any)[hookName] === 'function') {
                    await (instance as any)[hookName]();
                }
            }
        }
    }

    /**
     * Calls OnModuleInit on all modules
     */
    async onModuleInit(container: Container): Promise<void> {
        this.logger.log('Calling OnModuleInit...');
        await this.callHook('onModuleInit', container);
    }

    /**
     * Calls OnApplicationBootstrap on all modules
     */
    async onApplicationBootstrap(container: Container): Promise<void> {
        this.logger.log('Calling OnApplicationBootstrap...');
        await this.callHook('onApplicationBootstrap', container);
    }

    /**
     * Calls shutdown hooks on all modules
     */
    async onApplicationShutdown(container: Container): Promise<void> {
        this.logger.log('Calling shutdown hooks...');
        await this.callHook('beforeApplicationShutdown', container);
        await this.callHook('onApplicationShutdown', container);
    }
}
