
import { Hono } from 'hono';
import { INestApplication, ExceptionFilter, PipeTransform, NestInterceptor, CanActivate, Type } from './interfaces';
import { Container } from './injector/container';
import { Injector } from './injector/injector';
import { ContextId } from './injector/context-id';

export class BunApplication implements INestApplication {
    private globalFilters: ExceptionFilter[] = [];
    private globalPipes: PipeTransform[] = [];
    private globalGuards: CanActivate[] = [];
    private globalInterceptors: NestInterceptor[] = [];

    constructor(
        private readonly app: Hono,
        private readonly container: Container,
        private readonly injector: Injector
    ) { }

    useGlobalFilters(...filters: ExceptionFilter[]): this {
        this.globalFilters.push(...filters);
        return this;
    }

    useGlobalPipes(...pipes: PipeTransform[]): this {
        this.globalPipes.push(...pipes);
        return this;
    }

    useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
        this.globalInterceptors.push(...interceptors);
        return this;
    }

    useGlobalGuards(...guards: CanActivate[]): this {
        this.globalGuards.push(...guards);
        return this;
    }

    async init(): Promise<this> {
        return this;
    }

    async listen(port: number | string, callback?: () => void): Promise<any> {
        const server = Bun.serve({
            port: Number(port),
            fetch: this.app.fetch,
        });
        if (callback) callback();
        return server;
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
        // TODO: Implement shutdown hooks
    }

    // Getters for global items (internal use)
    public getGlobalFilters() { return this.globalFilters; }
    public getGlobalPipes() { return this.globalPipes; }
    public getGlobalGuards() { return this.globalGuards; }
    public getGlobalInterceptors() { return this.globalInterceptors; }
}
