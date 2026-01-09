import 'reflect-metadata';
import { Hono, Context, Next } from 'hono';
import { Observable, from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Container } from './injector/container';
import { Scanner } from './scanner';
import { Injector } from './injector/injector';
import { METADATA_KEYS } from './constants';
import { RouteDefinition, RouteParamtypes, RequestMethod } from './decorators';
import { ContextId } from './injector/context-id';
import { Scope } from './injector/scope';
import { ExecutionContextHost } from './execution-context-host';
import { InstanceWrapper } from './injector/instance-wrapper';
import { InjectionToken } from './injector/token';
import { Type, IApplication } from './interfaces';
import { Application } from './application';
import { MiddlewareBuilder } from './middleware/builder';
import { HttpException } from './common/exceptions';
import { StatusCode } from 'hono/utils/http-status';
import { Logger } from './services/logger.service';

/**
 * Factory class for creating Hono DI applications
 * 
 * @remarks
 * This is the main entry point for bootstrapping a Hono DI application.
 * It handles module scanning, dependency resolution, and application initialization.
 * 
 * @example
 * Basic usage:
 * ```typescript
 * @Module({
 *   controllers: [AppController],
 *   providers: [AppService]
 * })
 * class AppModule {}
 * 
 * const app = await HonoDiFactory.create(AppModule);
 * ```
 * 
 * @example
 * With custom Hono instance:
 * ```typescript
 * const hono = new Hono();
 * const app = await HonoDiFactory.create(AppModule, hono);
 * ```
 * 
 * @example
 * With manual initialization:
 * ```typescript
 * const app = await HonoDiFactory.create(AppModule, { autoInit: false });
 * app.setGlobalPrefix('api/v1');
 * await app.init();
 * ```
 * 
 * @public
 */
export class HonoDiFactory {
    private static logger = new Logger('Factory');

    /**
     * Creates and bootstraps a Hono DI application
     * 
     * @param rootModule - The root module class decorated with @Module
     * @param appOrOptions - Optional Hono instance or configuration options
     * @param appOrOptions.app - Custom Hono instance to use
     * @param appOrOptions.autoInit - Whether to automatically initialize the app (default: true)
     * 
     * @returns Promise resolving to the initialized application instance
     * 
     * @throws {Error} If module scanning fails
     * @throws {Error} If circular dependencies are detected
     * @throws {Error} If required dependencies cannot be resolved
     * 
     * @remarks
     * The creation process includes:
     * 1. Module scanning and dependency graph building
     * 2. Scope bubbling optimization (REQUEST-scoped propagation)
     * 3. Singleton provider instantiation
     * 4. Lifecycle hook execution (OnModuleInit, OnApplicationBootstrap)
     * 5. Route registration and middleware setup
     * 
     * @public
     */
    public static async create(rootModule: any, appOrOptions?: Hono | { app?: Hono, autoInit?: boolean }): Promise<IApplication> {
        let app: Hono | undefined;
        let autoInit = true;

        if (appOrOptions && 'fetch' in appOrOptions && typeof appOrOptions.fetch === 'function') {
             // Basic duck typing for Hono instance or instanceof check if imported
             app = appOrOptions as Hono;
        } else if (appOrOptions) {
            const options = appOrOptions as { app?: Hono, autoInit?: boolean };
            app = options.app;
            if (options.autoInit !== undefined) {
                autoInit = options.autoInit;
            }
        }

        const container = new Container();
        const scanner = new Scanner(container);
        const injector = new Injector(container);
        const honoApp = app || new Hono();
        const bunApp = new Application(honoApp, container, injector);

        // 1. Scan and Build Graph
        this.logger.log('Scanning modules...');
        await scanner.scan(rootModule);

        // 2. Apply scope bubbling: if a provider/controller has REQUEST-scoped dependencies,
        // it must also become REQUEST-scoped to ensure fresh instances per request
        this.applyScopeBubbling(container);

        // 3. Instantiate Global Singletons
        this.logger.log('Instantiating providers...');
        await this.instantiateProviders(container, injector);

        // 4. Call OnModuleInit
        this.logger.log('Calling OnModuleInit...');
        await this.callLifecycleHook('onModuleInit', container);

        if (autoInit) {
            await bunApp.init();
        }

        return bunApp;
    }

    private static applyScopeBubbling(container: Container) {
        const modules = container.getModules();
        
        // Performance: Build token→wrapper lookup map once O(n)
        // This eliminates O(n²) nested searches
        const tokenMap = new Map<InjectionToken, InstanceWrapper>();
        for (const module of modules.values()) {
            for (const wrapper of module.providers.values()) {
                tokenMap.set(wrapper.token, wrapper);
            }
            for (const wrapper of module.controllers.values()) {
                tokenMap.set(wrapper.token, wrapper);
            }
        }
        
        // Helper function to check if a wrapper has REQUEST-scoped dependencies
        const hasRequestScopedDeps = (wrapper: InstanceWrapper, visited = new Set<InstanceWrapper>()): boolean => {
            if (visited.has(wrapper)) return false;
            visited.add(wrapper);

            // Check constructor dependencies
            if (wrapper.inject) {
                for (const token of wrapper.inject) {
                    // O(1) Map lookup instead of O(n) module search
                    const depWrapper = tokenMap.get(token);
                    if (depWrapper) {
                        if (depWrapper.scope === Scope.REQUEST) {
                            return true;
                        }
                        // Recursively check dependencies
                        if (hasRequestScopedDeps(depWrapper, visited)) {
                            return true;
                        }
                    }
                }
            }

            // Check property dependencies
            if (wrapper.properties) {
                for (const prop of wrapper.properties) {
                    // O(1) Map lookup
                    const depWrapper = tokenMap.get(prop.token);
                    if (depWrapper) {
                        if (depWrapper.scope === Scope.REQUEST) {
                            return true;
                        }
                        if (hasRequestScopedDeps(depWrapper, visited)) {
                            return true;
                        }
                    }
                }
            }

            return false;
        };

        // Apply bubbling
        for (const module of modules.values()) {
            for (const wrapper of module.providers.values()) {
                if (wrapper.scope === Scope.DEFAULT && hasRequestScopedDeps(wrapper)) {
                    wrapper.scope = Scope.REQUEST;
                }
            }
            for (const wrapper of module.controllers.values()) {
                if (wrapper.scope === Scope.DEFAULT && hasRequestScopedDeps(wrapper)) {
                    wrapper.scope = Scope.REQUEST;
                }
            }
        }
    }

    private static async instantiateProviders(container: Container, injector: Injector) {
        const modules = container.getModules();
        const globalContextId = new ContextId();
        for (const module of modules.values()) {
            for (const wrapper of module.providers.values()) {
                if (wrapper.scope === Scope.DEFAULT) {
                    await injector.loadInstance(wrapper, globalContextId);
                }
            }
            for (const wrapper of module.controllers.values()) {
                if (wrapper.scope === Scope.DEFAULT) {
                    await injector.loadInstance(wrapper, globalContextId);
                }
            }
        }
    }

    private static async callLifecycleHook(hook: string, container: Container) {
        const modules = container.getModules();
        for (const module of modules.values()) {
            for (const wrapper of module.providers.values()) {
                if (wrapper.instance && (wrapper.instance as any)[hook]) {
                    await (wrapper.instance as any)[hook]();
                }
            }
            for (const wrapper of module.controllers.values()) {
                if (wrapper.instance && (wrapper.instance as any)[hook]) {
                    await (wrapper.instance as any)[hook]();
                }
            }
        }
    }
}
