import 'reflect-metadata';
import { Hono, Context } from 'hono';
import { Observable, from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Container } from './injector/container';
import { NestScanner } from './scanner';
import { Injector } from './injector/injector';
import { METADATA_KEYS } from './constants';
import { RouteDefinition, RouteParamtypes, RequestMethod } from './decorators';
import { ContextId } from './injector/context-id';
import { Scope } from './injector/scope';
import { ExecutionContextHost } from './execution-context-host';
import { InstanceWrapper } from './injector/instance-wrapper';
import { Type, INestApplication } from './interfaces';
import { BunApplication } from './application';
import { MiddlewareBuilder } from './middleware/builder';
import { HttpException } from '../common/exceptions';
import { StatusCode } from 'hono/utils/http-status';

export class BunDIFactory {
    public static async create(rootModule: any, app?: Hono): Promise<INestApplication> {
        const container = new Container();
        const scanner = new NestScanner(container);
        const injector = new Injector(container);
        const honoApp = app || new Hono();
        const bunApp = new BunApplication(honoApp, container, injector);

        // 1. Scan and Build Graph
        console.log('[BunDI] Scanning modules...');
        await scanner.scan(rootModule);

        // 2. Instantiate Global Singletons
        console.log('[BunDI] Instantiating providers...');
        await this.instantiateProviders(container, injector);

        // 3. Initialize Middleware
        console.log('[BunDI] Initializing middleware...');
        await this.initializeMiddleware(honoApp, container, injector);

        // 4. Register Controllers
        console.log('[BunDI] Registering controllers...');
        this.registerControllersFromContainer(honoApp, container, injector, bunApp);

        // 5. Call OnModuleInit
        console.log('[BunDI] Calling OnModuleInit...');
        await this.callLifecycleHook('onModuleInit', container);

        // 5. Call OnApplicationBootstrap
        console.log('[BunDI] Calling OnApplicationBootstrap...');
        await this.callLifecycleHook('onApplicationBootstrap', container);

        return bunApp;
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

    private static registerControllersFromContainer(app: Hono, container: Container, injector: Injector, bunApp: BunApplication) {
        const modules = container.getModules();
        modules.forEach((module) => {
            module.controllers.forEach((wrapper) => {
                this.registerControllerRoutes(wrapper.metatype, app, module, container, injector, bunApp);
            });
        });
    }

    private static registerControllerRoutes(controllerClass: any, app: Hono, moduleRef: any, container: Container, injector: Injector, bunApp: BunApplication) {
        if (!Reflect.hasMetadata(METADATA_KEYS.CONTROLLER, controllerClass)) {
            return;
        }

        const { prefix } = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, controllerClass);
        const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, controllerClass) as RouteDefinition[];

        if (!routes) return;

        routes.forEach((route) => {
            const fullPath = this.combinePaths(prefix, route.path);

            (app as any)[route.requestMethod](fullPath, async (c: any) => {
                const contextId = new ContextId();
                const executionContext = new ExecutionContextHost([c], controllerClass, controllerClass.prototype[route.methodName]);

                try {
                    const wrapper = moduleRef.getProvider(controllerClass) || moduleRef.controllers.get(controllerClass);
                    if (!wrapper) {
                        throw new Error(`Controller ${controllerClass.name} not found in module ${moduleRef.metatype.name}`);
                    }

                    const controllerInstance = await injector.loadInstance(wrapper, contextId);
                    const handler = (controllerInstance as any)[route.methodName].bind(controllerInstance);

                    // 1. Guards (Global -> Controller -> Method)
                    const globalGuards = bunApp.getGlobalGuards();
                    const guards = await this.resolveContextItems(
                        [
                            ...globalGuards,
                            ...(Reflect.getMetadata(METADATA_KEYS.USE_GUARDS, controllerClass) || []),
                            ...(Reflect.getMetadata(METADATA_KEYS.USE_GUARDS, (controllerInstance as any)[route.methodName]) || [])
                        ],
                        moduleRef,
                        contextId,
                        injector,
                        container
                    );

                    if (!await this.runGuards(guards, executionContext)) {
                        c.status(403);
                        return c.json({ statusCode: 403, message: 'Forbidden resource' });
                    }

                    // 2. Interceptors (Global -> Controller -> Method)
                    const globalInterceptors = bunApp.getGlobalInterceptors();
                    const interceptors = await this.resolveContextItems(
                        [
                            ...globalInterceptors,
                            ...(Reflect.getMetadata(METADATA_KEYS.USE_INTERCEPTORS, controllerClass) || []),
                            ...(Reflect.getMetadata(METADATA_KEYS.USE_INTERCEPTORS, (controllerInstance as any)[route.methodName]) || [])
                        ],
                        moduleRef,
                        contextId,
                        injector,
                        container
                    );

                    // 3. Pipes (Global -> Controller -> Method)
                    const globalPipes = bunApp.getGlobalPipes();
                    const pipes = await this.resolveContextItems(
                        [
                            ...globalPipes,
                            ...(Reflect.getMetadata(METADATA_KEYS.USE_PIPES, controllerClass) || []),
                            ...(Reflect.getMetadata(METADATA_KEYS.USE_PIPES, (controllerInstance as any)[route.methodName]) || [])
                        ],
                        moduleRef,
                        contextId,
                        injector,
                        container
                    );

                    // Resolve Args
                    const args = await this.resolveArgs(
                        contextId,
                        executionContext,
                        controllerClass,
                        route.methodName,
                        moduleRef,
                        injector,
                        container,
                        pipes
                    );

                    if (args.length === 0 && !Reflect.hasMetadata(METADATA_KEYS.ROUTE_ARGS_METADATA, controllerClass, route.methodName)) {
                        args.push(c);
                    }

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

                    // Handle @HttpCode
                    const httpCode = Reflect.getMetadata(METADATA_KEYS.HTTP_CODE, (controllerInstance as any)[route.methodName]);
                    if (httpCode) {
                        c.status(httpCode);
                    }

                    // Handle @Header
                    const headers = Reflect.getMetadata(METADATA_KEYS.HEADERS, (controllerInstance as any)[route.methodName]);
                    if (headers) {
                        headers.forEach((h: any) => c.header(h.name, h.value));
                    }

                    // Handle @Redirect
                    const redirect = Reflect.getMetadata(METADATA_KEYS.REDIRECT, (controllerInstance as any)[route.methodName]);
                    if (redirect) {
                        if (result && typeof result === 'object' && result.url) {
                            return c.redirect(result.url, result.statusCode || redirect.statusCode);
                        }
                        return c.redirect(redirect.url, redirect.statusCode);
                    }

                    if (result instanceof Response) {
                        return result;
                    }
                    if (result && typeof result.text === 'function' && typeof result.headers === 'object') {
                        return result;
                    }

                    return c.json(result);

                } catch (exception) {
                    return await this.handleException(exception, c, controllerClass, route.methodName, moduleRef, contextId, injector, container, bunApp);
                }
            });

            console.log(`[Route] Mapped {${fullPath}, ${route.requestMethod.toUpperCase()}}`);
        });
    }

    private static async handleException(exception: any, c: Context, controllerClass: any, methodName: string, moduleRef: any, contextId: any, injector: Injector, container: Container, bunApp: BunApplication) {
        const globalFilters = bunApp.getGlobalFilters();
        const filters = await this.resolveContextItems(
            [
                ...(Reflect.getMetadata(METADATA_KEYS.USE_FILTERS, (moduleRef.controllers.get(controllerClass)?.instance as any)?.[methodName]) || []),
                ...(Reflect.getMetadata(METADATA_KEYS.USE_FILTERS, controllerClass) || []),
                ...globalFilters
            ],
            moduleRef,
            contextId,
            injector,
            container
        );

        for (const filter of filters) {
            const catchExceptions = Reflect.getMetadata(METADATA_KEYS.FILTER_CATCH, filter.constructor) || [];
            if (catchExceptions.length === 0 || catchExceptions.some((e: any) => exception instanceof e)) {
                const host = new ExecutionContextHost([c], controllerClass, (moduleRef.controllers.get(controllerClass)?.instance as any)?.[methodName]);
                return await filter.catch(exception, host);
            }
        }

        console.error(exception);

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
    }

    private static async resolveContextItems(items: any[], moduleRef: any, contextId: any, injector: Injector, container: Container): Promise<any[]> {
        const instances = [];
        const scanner = new NestScanner(container);
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
                    scanner.scanDependencies(wrapper);
                }
                const instance = await injector.loadInstance(wrapper, contextId);
                instances.push(instance);
            } else {
                instances.push(item);
            }
        }
        return instances;
    }

    private static async resolveArgs(contextId: ContextId, context: ExecutionContextHost, controller: Type<any>, methodName: string, moduleRef: any, injector: Injector, container: Container, methodPipes: any[] = []) {
        const argsMetadata = Reflect.getMetadata(METADATA_KEYS.ROUTE_ARGS_METADATA, controller, methodName) || {};
        const args: any[] = [];
        const c = context.getArgs()[0];

        const sortedArgs = Object.values(argsMetadata).sort((a: any, b: any) => a.index - b.index);

        for (const arg of sortedArgs as any[]) {
            let value;
            const { index, data, pipes, paramtype } = arg;

            switch (paramtype) {
                case RouteParamtypes.REQUEST: value = c.req; break;
                case RouteParamtypes.RESPONSE: value = c.res; break;
                case RouteParamtypes.NEXT: value = null; break;
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
                default: value = null;
            }

            const paramPipeInstances = await this.resolveContextItems(pipes || [], moduleRef, contextId, injector, container);
            const allPipes = [...methodPipes, ...paramPipeInstances];

            for (const pipe of allPipes) {
                value = await pipe.transform(value, { type: 'custom', metatype: null, data });
            }

            args[index] = value;
        }

        return args;
    }

    private static async runGuards(guards: any[], context: any): Promise<boolean> {
        for (const guard of guards) {
            const result = await guard.canActivate(context);
            if (!result) return false;
        }
        return true;
    }

    private static async initializeMiddleware(app: Hono, container: Container, injector: Injector) {
        const builder = new MiddlewareBuilder();
        const modules = container.getModules();

        for (const module of modules.values()) {
            const moduleClass = module.metatype;
            const wrapper = module.getProvider(moduleClass);
            if (wrapper && wrapper.instance && (wrapper.instance as any).configure) {
                (wrapper.instance as any).configure(builder);
            }
        }

        const configs = builder.getConfigs();
        if (configs.length === 0) return;

        // Pre-resolve middleware instances (Singleton assumption)
        const resolvedConfigs: any[] = [];
        const globalContextId = new ContextId();

        for (const config of configs) {
            const instances: any[] = [];
            for (const m of config.middleware) {
                if (typeof m === 'function' && !m.prototype?.use) {
                    // Functional middleware
                    instances.push(m);
                } else {
                    // Class middleware
                    const wrapper = new InstanceWrapper({
                        token: m,
                        name: m.name,
                        metatype: m,
                        scope: Scope.TRANSIENT
                    });
                    const scanner = new NestScanner(container);
                    scanner.scanDependencies(wrapper);
                    const hostModule = modules.values().next().value;
                    wrapper.host = hostModule;

                    const instance = await injector.loadInstance(wrapper, globalContextId);
                    instances.push(instance);
                }
            }
            resolvedConfigs.push({ ...config, instances });
        }

        app.use('*', async (c, next) => {
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

            const executeChain = async (index: number, finalNext: () => Promise<void>): Promise<void> => {
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
                        const result = useFn(c.req, c, nextFn);

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

    private static isRouteMatch(routes: any[], path: string, method: string): boolean {
        for (const route of routes) {
            if (typeof route === 'string') {
                if (route === '*' || path.startsWith(route)) return true;
                if (path === route) return true;
            } else if (typeof route === 'object' && route.path && route.method) {
                // RouteInfo
                if (route.method !== -1 && route.method !== RequestMethod.ALL && route.method !== method.toLowerCase()) {
                    continue;
                }
                if (route.path === '*' || path === route.path) return true;
            } else if (typeof route === 'function') {
                // Controller class
                const prefix = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, route)?.prefix || '';
                if (path.startsWith(this.combinePaths(prefix, ''))) return true;
            }
        }
        return false;
    }

    private static isRouteExcluded(routes: any[], path: string, method: string): boolean {
        return this.isRouteMatch(routes, path, method);
    }

    private static combinePaths(prefix: string, path: string): string {
        const cleanPrefix = prefix ? prefix.replace(/^\/+/, '').replace(/\/+$/, '') : '';
        const cleanPath = path ? path.replace(/^\/+/, '').replace(/\/+$/, '') : '';
        let result = '';
        if (cleanPrefix) result += `/${cleanPrefix}`;
        if (cleanPath) result += `/${cleanPath}`;
        return result || '/';
    }
}
