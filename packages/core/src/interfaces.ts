import type { Context, Hono, HonoRequest, MiddlewareHandler, Next } from 'hono';
import type { Observable } from 'rxjs';

import { Scope } from './injector/scope';

export enum RequestMethod {
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    DELETE = 'delete',
    PATCH = 'patch',
    ALL = 'all',
    OPTIONS = 'options',
    HEAD = 'head',
}

export interface ModuleOptions {
    imports?: Array<Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference>;
    controllers?: Type<any>[];
    providers?: Provider[];
    exports?: Array<DynamicModule | Promise<DynamicModule> | string | symbol | Provider | ForwardReference | Function>;
}

export interface Type<T = any> extends Function {
    new(...args: any[]): T;
}

export interface ArgumentsHost {
    getArgs<T extends Array<any> = any[]>(): T;
    getType<TContext extends string = 'http'>(): TContext;
    switchToHttp(): HttpArgumentsHost;
}

export interface HttpArgumentsHost {
    getRequest<T extends string = any>(): HonoRequest<T, any>;
    getResponse<T = any>(): Context;
    getNext<T = any>(): Next;
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

export interface Interceptor<T = any, R = any> {
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

export type InjectionToken<T = any> = string | symbol | Type<T> | Function | ForwardReference;

export type Provider<T = any> =
    | Type<any>
    | ClassProvider<T>
    | ValueProvider<T>
    | FactoryProvider<T>
    | ExistingProvider<T>;

export interface ClassProvider<T = any> {
    provide: InjectionToken;
    useClass: Type<T>;
    scope?: Scope;
}

export interface ValueProvider<T = any> {
    provide: InjectionToken;
    useValue: T;
}

export interface FactoryProvider<T = any> {
    provide: InjectionToken;
    useFactory: (...args: any[]) => T | Promise<T>;
    inject?: InjectionToken[];
    scope?: Scope;
}

export interface ExistingProvider<T = any> {
    provide: InjectionToken;
    useExisting: InjectionToken;
}

export interface DynamicModule extends ModuleOptions {
    module: Type<any>;
    global?: boolean;
}

export interface ForwardReference {
    forwardRef: () => Type<any>;
}

export interface HonoDiMiddleware {
    use: MiddlewareHandler
}

export interface MiddlewareConsumer {
    apply(...middleware: (Type<any> | MiddlewareHandler)[]): MiddlewareConfigProxy;
}

export interface MiddlewareConfigProxy {
    exclude(...routes: (string | RouteInfo)[]): MiddlewareConfigProxy;
    forRoutes(...routes: (string | Type<any> | RouteInfo)[]): MiddlewareConsumer;
}

// Removed import { RequestMethod } from './decorators';
// Removed import { ModuleOptions } from './decorators';

export interface RouteInfo {
    path: string;
    method: RequestMethod;
}

export interface HonoDiModule {
    configure(consumer: MiddlewareConsumer): void;
}


export interface IApplication {
    useGlobalFilters(...filters: ExceptionFilter[]): this;
    useGlobalPipes(...pipes: PipeTransform[]): this;
    useGlobalInterceptors(...interceptors: Interceptor[]): this;
    useGlobalGuards(...guards: CanActivate[]): this;
    setGlobalPrefix(prefix: string): this;
    init(): Promise<this>;
    listen(port: number | string, callback?: () => void): Promise<any>;
    getHttpAdapter(): Hono;
    get<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol, options?: { strict?: boolean }): TResult;
    close(): Promise<void>;
}

