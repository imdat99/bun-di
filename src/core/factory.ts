import 'reflect-metadata';
import { Hono, Context } from 'hono';
import { Container } from './injector/container';
import { NestScanner } from './scanner';
import { Injector } from './injector/injector';
import { METADATA_KEYS } from './constants';
import { RouteDefinition } from './decorators';
import { ContextId } from './injector/context-id';

export class BunDIFactory {
    private static container = new Container();
    private static scanner = new NestScanner(BunDIFactory.container);
    private static injector = new Injector();

    public static async create(rootModule: any, app: Hono): Promise<Hono> {
        // 1. Scan and Build Graph
        console.log('[BunDI] Scanning modules...');
        const rootModuleRef = await this.scanner.scan(rootModule);

        // 2. Instantiate Global Singletons? 
        // Ideally we iterate all modules and force resolution of singletons
        // For now, lazily resolved when controller is resolved

        // 3. Register Controllers
        console.log('[BunDI] Registering controllers...');
        this.registerControllersFromContainer(app);

        return app;
    }

    private static registerControllersFromContainer(app: Hono) {
        const modules = this.container.getModules();

        modules.forEach((module) => {
            module.controllers.forEach((wrapper) => {
                this.registerControllerRoutes(wrapper.metatype, app, module);
            });
        });
    }

    private static registerControllerRoutes(controllerClass: any, app: Hono, moduleRef: any) {
        if (!Reflect.hasMetadata(METADATA_KEYS.CONTROLLER, controllerClass)) {
            return;
        }

        const { prefix } = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, controllerClass);
        const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, controllerClass) as RouteDefinition[];

        if (!routes) return;

        routes.forEach((route) => {
            const fullPath = this.combinePaths(prefix, route.path);

            // Register route handler
            (app as any)[route.requestMethod](fullPath, async (c: any) => {
                const contextId = new ContextId(); // Per-request ID

                try {
                    // Resolve Controller Instance per request (handling scopes)
                    // We need to find the wrapper again or pass it down. 
                    // Looking up by token in the specific module.
                    const wrapper = moduleRef.getProvider(controllerClass) || moduleRef.controllers.get(controllerClass);

                    if (!wrapper) {
                        throw new Error(`Controller ${controllerClass.name} not found in module ${moduleRef.metatype.name}`);
                    }

                    const controllerInstance = await this.injector.loadInstance(wrapper, contextId);

                    // Bind handler to instance
                    const handler = (controllerInstance as any)[route.methodName].bind(controllerInstance);

                    // TODO: Pipes & Interceptors here

                    return await handler(c);

                } catch (exception) {
                    // Start Exception Filter Pipeline
                    await this.handleException(exception, c, controllerClass, route.methodName);
                }
            });

            console.log(`[Route] Mapped {${fullPath}, ${route.requestMethod.toUpperCase()}}`);
        });
    }


    private static async handleException(exception: any, c: Context, controllerClass: any, methodName: string) {
        // 1. Get Global, Controller, and Method filters
        // For simplicity, we just use a basic error handler or the Global Filter if registered
        // Integrating fully with the new Injector for Filters would require resolving them from the module context

        // Fallback:
        console.error(exception);

        if (exception instanceof Error) { // Simple check
            c.status(500);
            return c.json({
                statusCode: 500,
                message: 'Internal Server Error',
                cause: exception.message
            });
        }
    }

    private static combinePaths(prefix: string, path: string): string {
        let result = '';
        if (prefix) result += `/${prefix.replace(/^\/+/, '').replace(/\/+$/, '')}`;
        if (path) result += `/${path.replace(/^\/+/, '').replace(/\/+$/, '')}`;
        return result || '/';
    }
}
