import { Context } from 'hono';

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
