import { Hono, Context, Next } from 'hono';
import { MiddlewareBuilder } from '../middleware/builder';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Container } from '../injector/container';
import { Injector } from '../injector/injector';
import { ContextId } from '../injector/context-id';
import { Logger } from '../services/logger.service';

/**
 * Resolved middleware configuration
 * @internal
 */
interface ResolvedMiddlewareConfig {
    routes: string[] | RegExp[];
    excludes: string[] | RegExp[];
    instances: any[];
}

/**
 * Handles middleware registration and execution
 * 
 * @internal
 */
export class MiddlewareHandler {
    private readonly logger = new Logger('MiddlewareHandler');

    /**
     * Registers all middleware to the Hono app
     * 
     * @param app - Hono instance
     * @param middlewareConfigs - Middleware configurations from modules
     * @param container - DI container
     * @param injector - Injector for resolving middleware instances
     */
    async registerMiddleware(
        app: Hono,
        middlewareConfigs: any[],
        container: Container,
        injector: Injector
    ): Promise<void> {
        const resolvedConfigs: ResolvedMiddlewareConfig[] = [];

        for (const config of middlewareConfigs) {
            const instances = [];
            for (const middleware of config.middlewares) {
                if (typeof middleware === 'function') {
                    const modules = container.getModules();
                    let wrapper: InstanceWrapper | undefined;

                    for (const module of modules.values()) {
                        wrapper = module.getProvider(middleware);
                        if (wrapper) break;
                    }

                    if (!wrapper) {
                        wrapper = new InstanceWrapper({
                            token: middleware,
                            name: middleware.name,
                            metatype: middleware,
                            host: Array.from(modules.values())[0]
                        });
                    }

                    const instance = wrapper.instance || await injector.loadInstance(wrapper, new ContextId());
                    instances.push(instance);
                } else {
                    instances.push(middleware);
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
            } else if (route instanceof RegExp) {
                if (route.test(path)) return true;
            }
        }
        return false;
    }

    private isRouteExcluded(excludes: any[], path: string, method: string): boolean {
        for (const exclude of excludes) {
            if (typeof exclude === 'string') {
                const normalizedExclude = exclude.startsWith('/') ? exclude : `/${exclude}`;
                if (path.startsWith(normalizedExclude)) return true;
            } else if (exclude instanceof RegExp) {
                if (exclude.test(path)) return true;
            }
        }
        return false;
    }
}
