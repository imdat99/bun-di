
import { Hono, Context, Next } from 'hono';
import { Observable, from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { IApplication, ExceptionFilter, PipeTransform, Interceptor, CanActivate, Type } from './interfaces';
import { Container } from './injector/container';
import { Injector } from './injector/injector';
import { ContextId } from './injector/context-id';
import { Scope } from './injector/scope';
import { InstanceWrapper } from './injector/instance-wrapper';
import { ExecutionContextHost } from './execution-context-host';
import { METADATA_KEYS } from './constants';
import { RouteDefinition, RouteParamtypes, RequestMethod } from './decorators';
import { MiddlewareBuilder } from './middleware/builder';
import { HttpException } from './common/exceptions';
import { StatusCode } from 'hono/utils/http-status';
import { Logger } from './services/logger.service';
import { HonoDiScanner } from './scanner';

// Performance: Cache for route metadata and resolved instances
interface ParsedArgMetadata {
    index: number;
    data?: any;
    paramtype: RouteParamtypes;
    pipes: any[];
}

interface RouteCache {
    wrapper: InstanceWrapper;
    handler: Function;
    guards: any[];
    interceptors: any[];
    pipes: any[];
    argsMetadata: ParsedArgMetadata[];
    httpCode?: number;
    headers?: any[];
    redirect?: any;
}

export class HonoDiApplication implements IApplication {
    private globalFilters: ExceptionFilter[] = [];
    private globalPipes: PipeTransform[] = [];
    private globalGuards: CanActivate[] = [];
    private globalInterceptors: Interceptor[] = [];
    private readonly scanner: HonoDiScanner;
    private readonly activeContexts = new Set<ContextId>();

    // Security: Dangerous property names that should not be injected
    private readonly UNSAFE_PROPERTIES = new Set(['__proto__', 'constructor', 'prototype']);

    // Performance: Route metadata cache
    private readonly routeCache = new Map<string, RouteCache>();

    constructor(
        private readonly app: Hono,
        private readonly container: Container,
        private readonly injector: Injector
    ) {
        this.scanner = new HonoDiScanner(container);
    }

    useGlobalFilters(...filters: ExceptionFilter[]): this {
        this.globalFilters.push(...filters);
        return this;
    }

    useGlobalPipes(...pipes: PipeTransform[]): this {
        this.globalPipes.push(...pipes);
        return this;
    }

    useGlobalInterceptors(...interceptors: Interceptor[]): this {
        this.globalInterceptors.push(...interceptors);
        return this;
    }

    useGlobalGuards(...guards: CanActivate[]): this {
        this.globalGuards.push(...guards);
        return this;
    }

    private globalPrefix: string = '';

    setGlobalPrefix(prefix: string): this {
        if (this.isInitialized) {
            this.logger.warn('Setting global prefix after initialization will not affect existing routes. Use { autoInit: false } in HonoDiFactory.create() if you need to set a prefix.');
        }
        this.globalPrefix = prefix;
        return this;
    }

    public getGlobalPrefix() { return this.globalPrefix; }

    private readonly logger = new Logger('HonoDiApplication');
    private isInitialized = false;

    async init(): Promise<this> {
        if (this.isInitialized) return this;

        this.logger.log('Initializing middleware...');
        await this.initializeMiddleware();

        this.logger.log('Registering controllers...');
        this.registerControllersFromContainer();

        this.logger.log('Calling OnApplicationBootstrap...');
        await this.callLifecycleHook('onApplicationBootstrap');

        this.isInitialized = true;
        return this;
    }

    async listen(port: number | string, callback?: () => void): Promise<any> {
        if (!this.isInitialized) await this.init();

        const server = Bun.serve({
            port: Number(port),
            fetch: this.app.fetch,
        });
        if (callback) callback();
        return server;
    }

    private async callLifecycleHook(hook: string) {
        const modules = this.container.getModules();
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

    private registerControllersFromContainer() {
        const modules = this.container.getModules();
        modules.forEach((module) => {
            module.controllers.forEach((wrapper) => {
                this.registerControllerRoutes(wrapper.metatype, this.app, module);
            });
        });
    }

    private registerControllerRoutes(controllerClass: any, app: Hono, moduleRef: any) {
        if (!Reflect.hasMetadata(METADATA_KEYS.CONTROLLER, controllerClass)) {
            return;
        }

        const { prefix } = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, controllerClass);
        const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, controllerClass) as RouteDefinition[];

        if (!routes) return;

        // Performance: Pre-compute controller-level metadata once
        const controllerGuards = Reflect.getMetadata(METADATA_KEYS.USE_GUARDS, controllerClass) || [];
        const controllerInterceptors = Reflect.getMetadata(METADATA_KEYS.USE_INTERCEPTORS, controllerClass) || [];
        const controllerPipes = Reflect.getMetadata(METADATA_KEYS.USE_PIPES, controllerClass) || [];

        routes.forEach((route) => {
            const globalPrefix = this.getGlobalPrefix();
            const fullPath = this.combinePaths(globalPrefix, this.combinePaths(prefix, route.path));

            // Performance: Build cache entry for this route
            const cacheKey = `${controllerClass.name}.${route.methodName}`;
            const handler = controllerClass.prototype[route.methodName];

            // Get method-level metadata
            const methodGuards = Reflect.getMetadata(METADATA_KEYS.USE_GUARDS, handler) || [];
            const methodInterceptors = Reflect.getMetadata(METADATA_KEYS.USE_INTERCEPTORS, handler) || [];
            const methodPipes = Reflect.getMetadata(METADATA_KEYS.USE_PIPES, handler) || [];

            // Pre-compute merged arrays (avoid spreading on every request)
            const allGuards = [...this.globalGuards, ...controllerGuards, ...methodGuards];
            const allInterceptors = [...this.globalInterceptors, ...controllerInterceptors, ...methodInterceptors];
            const allPipes = [...this.globalPipes, ...controllerPipes, ...methodPipes];

            // Pre-parse args metadata (avoid reflection and sorting on every request)
            const argsMetadata = Reflect.getMetadata(METADATA_KEYS.ROUTE_ARGS_METADATA, controllerClass, route.methodName) || {};
            const parsedArgs: ParsedArgMetadata[] = Object.values(argsMetadata)
                .sort((a: any, b: any) => a.index - b.index)
                .map((arg: any) => ({
                    index: arg.index,
                    data: arg.data,
                    paramtype: arg.paramtype,
                    pipes: arg.pipes || []
                }));

            // Get wrapper (will be cached)
            const wrapper = moduleRef.controllers.get(controllerClass);

            // Store in cache
            this.routeCache.set(cacheKey, {
                wrapper,
                handler,
                guards: allGuards,
                interceptors: allInterceptors,
                pipes: allPipes,
                argsMetadata: parsedArgs,
                httpCode: Reflect.getMetadata(METADATA_KEYS.HTTP_CODE, handler),
                headers: Reflect.getMetadata(METADATA_KEYS.HEADERS, handler),
                redirect: Reflect.getMetadata(METADATA_KEYS.REDIRECT, handler)
            });

            (app as any)[route.requestMethod](fullPath, async (c: any) => {
                const contextId = new ContextId();
                this.activeContexts.add(contextId);

                // Performance: Use cached metadata
                const cacheKey = `${controllerClass.name}.${route.methodName}`;
                const cache = this.routeCache.get(cacheKey)!;
                const executionContext = new ExecutionContextHost([c], controllerClass, cache.handler);

                try {
                    // Performance: Direct instance access for DEFAULT scope
                    let controllerInstance;
                    if (cache.wrapper.scope === Scope.DEFAULT && cache.wrapper.isResolved) {
                        controllerInstance = cache.wrapper.instance;
                    } else {
                        controllerInstance = await this.injector.loadInstance(cache.wrapper, contextId);
                    }

                    const handler = (controllerInstance as any)[route.methodName].bind(controllerInstance);

                    // 1. Guards (using cached array - no reflection!)
                    const guards = await this.resolveContextItems(cache.guards, moduleRef, contextId);
                    if (!await this.runGuards(guards, executionContext)) {
                        c.status(403);
                        return c.json({ statusCode: 403, message: 'Forbidden resource' });
                    }

                    // 2. Interceptors (using cached array - no reflection!)
                    const interceptors = await this.resolveContextItems(cache.interceptors, moduleRef, contextId);

                    // 3. Pipes (using cached array - no reflection!)
                    const pipes = await this.resolveContextItems(cache.pipes, moduleRef, contextId);

                    // 4. Args (using pre-parsed metadata - no reflection or sorting!)
                    const args = cache.argsMetadata.length > 0
                        ? await this.resolveArgsFromCache(c, cache.argsMetadata, pipes, executionContext, moduleRef, contextId)
                        : [c]; // Default to context if no args

                    const interceptorChain = async (index: number): Promise<Observable<any>> => {
                        if (index >= interceptors.length) {
                            return new Observable((subscriber) => {
                                try {
                                    const result = handler(...args);
                                    if (result instanceof Promise) {
                                        result
                                            .then((data) => {
                                                subscriber.next(data);
                                                subscriber.complete();
                                            })
                                            .catch((err) => subscriber.error(err));
                                    } else {
                                        subscriber.next(result);
                                        subscriber.complete();
                                    }
                                } catch (err) {
                                    subscriber.error(err);
                                }
                            });
                        }
                        return interceptors[index].intercept(executionContext, {
                            handle: () => from(interceptorChain(index + 1)).pipe(mergeMap((obs) => obs))
                        });
                    };

                    const obs = await interceptorChain(0);
                    const result = await lastValueFrom(obs);

                    // Performance: Use cached HTTP decorators
                    if (cache.httpCode) {
                        c.status(cache.httpCode);
                    }

                    if (cache.headers) {
                        cache.headers.forEach((h: any) => c.header(h.name, h.value));
                    }

                    if (cache.redirect) {
                        if (result && typeof result === 'object' && result.url) {
                            return c.redirect(result.url, result.statusCode || cache.redirect.statusCode);
                        }
                        return c.redirect(cache.redirect.url, cache.redirect.statusCode);
                    }

                    if (result instanceof Response) {
                        return result;
                    }
                    if (result && typeof result.text === 'function' && typeof result.headers === 'object') {
                        return result;
                    }

                    return c.json(result);

                } catch (exception) {
                    return await this.handleException(exception, c, controllerClass, route.methodName, moduleRef, contextId);
                } finally {
                    // Cleanup request-scoped instances after request completes
                    this.cleanupContext(contextId);
                }
            });

            this.logger.log(`[Route] Mapped {${fullPath}, ${route.requestMethod.toUpperCase()}}`);
        });
    }

    private async handleException(exception: any, c: Context, controllerClass: any, methodName: string, moduleRef: any, contextId: any) {
        const filters = await this.resolveContextItems(
            [
                ...(Reflect.getMetadata(METADATA_KEYS.USE_FILTERS, (moduleRef.controllers.get(controllerClass)?.instance as any)?.[methodName]) || []),
                ...(Reflect.getMetadata(METADATA_KEYS.USE_FILTERS, controllerClass) || []),
                ...this.globalFilters
            ],
            moduleRef,
            contextId
        );

        for (const filter of filters) {
            const catchExceptions = Reflect.getMetadata(METADATA_KEYS.FILTER_CATCH, filter.constructor) || [];
            if (catchExceptions.length === 0 || catchExceptions.some((e: any) => exception instanceof e)) {
                const host = new ExecutionContextHost([c], controllerClass, (moduleRef.controllers.get(controllerClass)?.instance as any)?.[methodName]);
                return await filter.catch(exception, host);
            }
        }

        this.logger.error(exception);

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const response = exception.getResponse();
            c.status(status as StatusCode);
            return c.json(response);
        }

        if (exception instanceof Error) {
            c.status(500);
            return c.json({
                statusCode: 500,
                message: 'Internal Server Error',
                cause: exception.message
            });
        }

        // Default handler for non-Error exceptions
        c.status(500);
        return c.json({
            statusCode: 500,
            message: 'Internal Server Error',
            error: String(exception)
        });
    }

    private async resolveContextItems(items: any[], moduleRef: any, contextId: any): Promise<any[]> {
        const instances = [];
        // Reuse scanner instance instead of creating new one
        for (const item of items) {
            if (typeof item === 'function') {
                let wrapper = moduleRef.getProvider(item);
                if (!wrapper) {
                    wrapper = new InstanceWrapper({
                        token: item,
                        name: item.name,
                        metatype: item,
                        host: moduleRef,
                        scope: Scope.TRANSIENT
                    });
                    this.scanner.scanDependencies(wrapper);
                }
                const instance = await this.injector.loadInstance(wrapper, contextId);
                instances.push(instance);
            } else {
                instances.push(item);
            }
        }
        return instances;
    }

    private async resolveArgs(contextId: ContextId, context: ExecutionContextHost, controller: Type<any>, methodName: string, moduleRef: any, methodPipes: any[] = []) {
        const argsMetadata = Reflect.getMetadata(METADATA_KEYS.ROUTE_ARGS_METADATA, controller, methodName) || {};
        const args: any[] = [];
        const c = context.getArgs()[0];

        const sortedArgs = Object.values(argsMetadata).sort((a: any, b: any) => a.index - b.index);

        for (const arg of sortedArgs as any[]) {
            let value;
            const { index, data, pipes, paramtype } = arg;

            switch (paramtype) {
                case RouteParamtypes.REQUEST: value = c.req; break;
                case RouteParamtypes.RESPONSE: value = c; break;
                case RouteParamtypes.NEXT: value = context.getArgs()[1]; break;
                case RouteParamtypes.CONTEXT: value = c; break;
                case RouteParamtypes.BODY:
                    if (data && c.req.parseBody) {
                        const body = await c.req.parseBody();
                        value = body[data];
                    } else {
                        try {
                            const body = await c.req.json();
                            value = data ? body[data] : body;
                        } catch (e) { value = null; }
                    }
                    break;
                case RouteParamtypes.QUERY: value = data ? c.req.query(data) : c.req.query(); break;
                case RouteParamtypes.PARAM: value = data ? c.req.param(data) : c.req.param(); break;
                case RouteParamtypes.HEADERS: value = data ? c.req.header(data) : c.req.header(); break;
                case RouteParamtypes.IP: value = c.req.header('x-forwarded-for') || '127.0.0.1'; break;
                case RouteParamtypes.CUSTOM:
                    const factory = (arg as any).pipes[0]; // Factory is stored as first pipe arg in assignMetadata
                    // Note: In assignMetadata for CUSTOM, we passed factory as the last argument, which lands in 'pipes' array
                    // Let's verify how assignMetadata stores it.
                    // assignMetadata(args, paramtype, index, data, factory) -> factory is in ...pipes
                    if (typeof factory === 'function') {
                        value = factory(data, context);
                    }
                    break;
                default: value = null;
            }

            const paramPipeInstances = await this.resolveContextItems(pipes || [], moduleRef, contextId);
            const allPipes = [...methodPipes, ...paramPipeInstances];

            for (const pipe of allPipes) {
                value = await pipe.transform(value, { type: 'custom', metatype: null, data });
            }

            args[index] = value;
        }

        return args;
    }

    private async runGuards(guards: any[], context: any): Promise<boolean> {
        for (const guard of guards) {
            const result = await guard.canActivate(context);
            if (!result) return false;
        }
        return true;
    }

    // Performance: Optimized args resolution using pre-parsed metadata
    private async resolveArgsFromCache(
        c: Context,
        parsedArgs: ParsedArgMetadata[],
        methodPipes: any[],
        context: ExecutionContextHost,
        moduleRef: any,
        contextId: ContextId
    ): Promise<any[]> {
        const args: any[] = [];

        for (const arg of parsedArgs) {
            let value;

            // Extract value based on paramtype
            switch (arg.paramtype) {
                case RouteParamtypes.REQUEST: value = c.req; break;
                case RouteParamtypes.RESPONSE: value = c; break;
                case RouteParamtypes.CONTEXT: value = c; break;
                case RouteParamtypes.BODY:
                    try {
                        const body = await c.req.json();
                        value = arg.data ? body[arg.data] : body;
                    } catch (e) { value = null; }
                    break;
                case RouteParamtypes.QUERY: value = arg.data ? c.req.query(arg.data) : c.req.query(); break;
                case RouteParamtypes.PARAM: value = arg.data ? c.req.param(arg.data) : c.req.param(); break;
                case RouteParamtypes.HEADERS: value = arg.data ? c.req.header(arg.data) : c.req.header(); break;
                case RouteParamtypes.IP: value = c.req.header('x-forwarded-for') || '127.0.0.1'; break;
                case RouteParamtypes.CUSTOM:
                    const factory = arg.pipes[0];
                    if (typeof factory === 'function') {
                        value = factory(arg.data, context);
                    }
                    break;
                default: value = null;
            }

            // Apply parameter-level pipes
            const paramPipes = await this.resolveContextItems(arg.pipes, moduleRef, contextId);
            const allPipes = [...methodPipes, ...paramPipes];

            for (const pipe of allPipes) {
                value = await pipe.transform(value, { type: 'custom', metatype: null, data: arg.data });
            }

            args[arg.index] = value;
        }

        return args;
    }

    private async initializeMiddleware() {
        const configs: any[] = [];
        const modules = this.container.getModules();

        for (const module of modules.values()) {
            const moduleClass = module.metatype;
            const wrapper = module.getProvider(moduleClass);
            if (wrapper && wrapper.instance && (wrapper.instance as any).configure) {
                const builder = new MiddlewareBuilder(module);
                (wrapper.instance as any).configure(builder);
                configs.push(...builder.getConfigs());
            }
        }
        if (configs.length === 0) return;

        const resolvedConfigs: any[] = [];
        const globalContextId = new ContextId();

        for (const config of configs) {
            const instances: any[] = [];
            for (const m of config.middleware) {
                if (typeof m === 'function' && !m.prototype?.use) {
                    instances.push(m);
                } else {
                    const wrapper = new InstanceWrapper({
                        token: m,
                        name: m.name,
                        metatype: m,
                        scope: Scope.TRANSIENT
                    });
                    const scanner = new HonoDiScanner(this.container);
                    scanner.scanDependencies(wrapper);
                    const hostModule = config.module || modules.values().next().value;
                    wrapper.host = hostModule;

                    const instance = await this.injector.loadInstance(wrapper, globalContextId);
                    instances.push(instance);
                }
            }
            resolvedConfigs.push({ ...config, instances });
        }

        this.app.use('*', async (c, next) => {
            const path = c.req.path;
            const method = c.req.method;

            const matchingMiddleware: any[] = [];

            for (const config of resolvedConfigs) {
                if (this.isRouteExcluded(config.excludes, path, method)) continue;
                if (this.isRouteMatch(config.routes, path, method)) {
                    matchingMiddleware.push(...config.instances);
                }
            }

            if (matchingMiddleware.length === 0) {
                return await next();
            }

            const executeChain = async (index: number, finalNext: Next): Promise<void> => {
                if (index >= matchingMiddleware.length) {
                    return await finalNext();
                }
                const middleware = matchingMiddleware[index];

                return new Promise<void>((resolve, reject) => {
                    let nextCalled = false;
                    const nextFn = async () => {
                        nextCalled = true;
                        try {
                            await executeChain(index + 1, finalNext);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    };

                    try {
                        const useFn = middleware.use ? middleware.use.bind(middleware) : middleware;
                        const result = useFn(c, nextFn);

                        if (result instanceof Promise) {
                            result.then(() => {
                                if (!nextCalled) resolve();
                            }).catch(reject);
                        } else {
                            if (!nextCalled) resolve();
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            };

            await executeChain(0, next);
        });
    }

    private isRouteMatch(routes: any[], path: string, method: string): boolean {
        for (const route of routes) {
            if (typeof route === 'string') {
                const normalizedRoute = route === '*' ? '*' : (route.startsWith('/') ? route : `/${route}`);
                if (normalizedRoute === '*' || path.startsWith(normalizedRoute)) return true;
                if (path === normalizedRoute) return true;
            } else if (typeof route === 'object' && route.path && route.method) {
                if (route.method !== -1 && route.method !== RequestMethod.ALL && route.method !== method.toLowerCase()) {
                    continue;
                }
                if (route.path === '*' || path === route.path) return true;
            } else if (typeof route === 'function') {
                const prefix = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, route)?.prefix || '';
                if (path.startsWith(this.combinePaths(prefix, ''))) return true;
            }
        }
        return false;
    }

    private isRouteExcluded(routes: any[], path: string, method: string): boolean {
        return this.isRouteMatch(routes, path, method);
    }

    private combinePaths(prefix: string, path: string): string {
        const cleanPrefix = prefix ? prefix.replace(/^\/+/, '').replace(/\/+$/, '') : '';
        const cleanPath = path ? path.replace(/^\/+/, '').replace(/\/+$/, '') : '';
        let result = '';
        if (cleanPrefix) result += `/${cleanPrefix}`;
        if (cleanPath) result += `/${cleanPath}`;
        return result || '/';
    }

    getHttpAdapter(): any {
        return this.app;
    }

    get<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol, options?: { strict?: boolean }): TResult {
        // Simple implementation: search in all modules
        const modules = this.container.getModules();
        for (const module of modules.values()) {
            const provider = module.getProvider(typeOrToken);
            if (provider && provider.instance) {
                return provider.instance as TResult;
            }
        }
        throw new Error(`Provider ${String(typeOrToken)} not found`);
    }

    async close(): Promise<void> {
        // Call beforeApplicationShutdown hooks
        await this.callLifecycleHook('beforeApplicationShutdown');

        // Cleanup all active contexts
        for (const contextId of this.activeContexts) {
            this.cleanupContext(contextId);
        }
        this.activeContexts.clear();

        // Cleanup all request-scoped instances
        const modules = this.container.getModules();
        for (const module of modules.values()) {
            for (const wrapper of module.providers.values()) {
                if (wrapper.scope !== Scope.DEFAULT) {
                    wrapper.cleanup();
                }
            }
            for (const wrapper of module.controllers.values()) {
                if (wrapper.scope !== Scope.DEFAULT) {
                    wrapper.cleanup();
                }
            }
        }

        // Call onApplicationShutdown hooks
        await this.callLifecycleHook('onApplicationShutdown');
    }

    private cleanupContext(contextId: ContextId): void {
        this.activeContexts.delete(contextId);

        // Cleanup instances for this context
        const modules = this.container.getModules();
        for (const module of modules.values()) {
            for (const wrapper of module.providers.values()) {
                if (wrapper.scope === Scope.REQUEST) {
                    wrapper.cleanup(contextId);
                }
            }
            for (const wrapper of module.controllers.values()) {
                if (wrapper.scope === Scope.REQUEST) {
                    wrapper.cleanup(contextId);
                }
            }
        }
    }

    // Getters for global items (internal use)
    public getGlobalFilters() { return this.globalFilters; }
    public getGlobalPipes() { return this.globalPipes; }
    public getGlobalGuards() { return this.globalGuards; }
    public getGlobalInterceptors() { return this.globalInterceptors; }

    public getContainer(): Container {
        return this.container;
    }
}

