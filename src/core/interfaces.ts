import { Context } from 'hono';
import { Observable } from 'rxjs';

export type Scope = 'DEFAULT' | 'TRANSIENT' | 'REQUEST';

export interface Type<T = any> extends Function {
    new(...args: any[]): T;
}

export interface ArgumentsHost {
    getArgs<T extends Array<any> = any[]>(): T;
    getType<TContext extends string = 'http'>(): TContext;
    switchToHttp(): HttpArgumentsHost;
}

export interface HttpArgumentsHost {
    getRequest<T = any>(): T;
    getResponse<T = any>(): T;
    getNext<T = any>(): T;
    getContext(): Context; // Hono Context
}

export interface ExecutionContext extends ArgumentsHost {
    getClass<T = any>(): Type<T>;
    getHandler(): Function;
}

export interface ExceptionFilter<T = any> {
    catch(exception: T, host: ArgumentsHost): void;
}

export interface ArgumentMetadata {
    type: 'body' | 'query' | 'param' | 'custom';
    metatype?: Type<any>;
    data?: string;
}

export interface PipeTransform<T = any, R = any> {
    transform(value: T, metadata: ArgumentMetadata): R;
}

export interface CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

export interface CallHandler<T = any> {
    handle(): Observable<T>;
}

export interface NestInterceptor<T = any, R = any> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<R> | Promise<Observable<R>>;
}

export interface OnModuleInit {
    onModuleInit(): any;
}

export interface OnApplicationBootstrap {
    onApplicationBootstrap(): any;
}

export interface OnModuleDestroy {
    onModuleDestroy(): any;
}

export interface BeforeApplicationShutdown {
    beforeApplicationShutdown(signal?: string): any;
}

export interface OnApplicationShutdown {
    onApplicationShutdown(signal?: string): any;
}

export type Provider<T = any> =
    | Type<any>
    | ClassProvider<T>
    | ValueProvider<T>
    | FactoryProvider<T>
    | ExistingProvider<T>;

export interface ClassProvider<T = any> {
    provide: any;
    useClass: Type<T>;
    scope?: Scope;
}

export interface ValueProvider<T = any> {
    provide: any;
    useValue: T;
}

export interface FactoryProvider<T = any> {
    provide: any;
    useFactory: (...args: any[]) => T | Promise<T>;
    inject?: any[];
    scope?: Scope;
}

export interface ExistingProvider<T = any> {
    provide: any;
    useExisting: any;
}

export interface DynamicModule extends ModuleOptions {
    module: Type<any>;
    global?: boolean;
}

export interface ForwardReference {
    forwardRef: () => Type<any>;
}

export interface NestMiddleware {
    use(req: any, res: any, next: () => void): any;
}

export interface MiddlewareConsumer {
    apply(...middleware: (Type<any> | Function)[]): MiddlewareConfigProxy;
}

export interface MiddlewareConfigProxy {
    exclude(...routes: (string | RouteInfo)[]): MiddlewareConfigProxy;
    forRoutes(...routes: (string | Type<any> | RouteInfo)[]): MiddlewareConsumer;
}

export interface RouteInfo {
    path: string;
    method: RequestMethod;
}

import { RequestMethod } from './decorators';

export interface NestModule {
    configure(consumer: MiddlewareConsumer): void;
}

import { ModuleOptions } from './decorators';

export interface INestApplication {
    useGlobalFilters(...filters: ExceptionFilter[]): this;
    useGlobalPipes(...pipes: PipeTransform[]): this;
    useGlobalInterceptors(...interceptors: NestInterceptor[]): this;
    useGlobalGuards(...guards: CanActivate[]): this;
    init(): Promise<this>;
    listen(port: number | string, callback?: () => void): Promise<any>;
    getHttpAdapter(): any;
    get<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol, options?: { strict?: boolean }): TResult;
    close(): Promise<void>;
}

