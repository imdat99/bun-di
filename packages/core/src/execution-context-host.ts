import type { Context, Next } from 'hono';
import { ExecutionContext, Type, HttpArgumentsHost } from './interfaces';

export class ExecutionContextHost implements ExecutionContext {
    private readonly args: any[];
    private readonly constructorRef: Type<any>;
    private readonly handler: Function;
    private readonly context: Context<any>;
    private readonly next?: Next;

    constructor(args: any[], constructorRef: Type<any>, handler: Function) {
        this.args = args;
        this.constructorRef = constructorRef;
        this.handler = handler;
        // In Hono, the context is usually the first argument
        this.context = args[0];
        this.next = args[1];
    }

    getClass<T = any>(): Type<T> {
        return this.constructorRef;
    }

    getHandler(): Function {
        return this.handler;
    }

    getArgs<T extends Array<any> = any[]>(): T {
        return this.args as T;
    }

    getType<TContext extends string = 'http'>(): TContext {
        return 'http' as TContext;
    }

    switchToHttp(): HttpArgumentsHost {
        return {
            getRequest: () => this.context.req,
            getResponse: () => this.context,
            getNext: () => this.next ?? (() => Promise.resolve()),
            getContext: () => this.context,
        };
    }
}
