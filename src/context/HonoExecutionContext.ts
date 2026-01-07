import { Context } from 'hono';
import { ExecutionContext, HttpArgumentsHost, Type } from '../interfaces';

export class HonoExecutionContext implements ExecutionContext {
    constructor(
        private readonly context: Context,
        private readonly handler: Function,
        private readonly controllerClass: Type<any>
    ) { }

    getClass<T = any>(): Type<T> {
        return this.controllerClass;
    }

    getHandler(): Function {
        return this.handler;
    }

    getArgs<T extends Array<any> = any[]>(): T {
        return [this.context] as T;
    }

    getType<TContext extends string = 'http'>(): TContext {
        return 'http' as TContext;
    }

    switchToHttp(): HttpArgumentsHost {
        return {
            getRequest: <T = any>() => this.context.req as unknown as T,
            getResponse: <T = any>() => this.context.res as unknown as T, // Note: Hono Response object is immutable in some contexts, but here we return it
            getNext: <T = any>() => null as unknown as T,
            getContext: () => this.context
        };
    }
}
