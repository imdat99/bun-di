import 'reflect-metadata';
import { Hono, Context, Next } from 'hono';
import { Observable, from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Container } from './injector/container';
import { HonoDiScanner } from './scanner';
import { Injector } from './injector/injector';
import { METADATA_KEYS } from './constants';
import { RouteDefinition, RouteParamtypes, RequestMethod } from './decorators';
import { ContextId } from './injector/context-id';
import { Scope } from './injector/scope';
import { ExecutionContextHost } from './execution-context-host';
import { InstanceWrapper } from './injector/instance-wrapper';
import { InjectionToken } from './injector/token';
import { Type, IApplication } from './interfaces';
import { HonoDiApplication } from './application';
import { MiddlewareBuilder } from './middleware/builder';
import { HttpException } from './common/exceptions';
import { StatusCode } from 'hono/utils/http-status';
import { Logger } from './services/logger.service';

export class HonoDiFactory {
    private static logger = new Logger('HonoDiFactory');

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
        const scanner = new HonoDiScanner(container);
        const injector = new Injector(container);
        const honoApp = app || new Hono();
        const bunApp = new HonoDiApplication(honoApp, container, injector);

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
