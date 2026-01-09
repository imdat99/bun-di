import { Context } from 'hono';
import { RouteParamtypes } from '../decorators';
import type { PipeTransform, ExecutionContext } from '../interfaces';
import { Module } from '../injector/module';
import { ContextId } from '../injector/context-id';

/**
 * Parsed argument metadata for route handlers
 * @internal
 */
export interface ParsedArgMetadata {
    index: number;
    data?: any;
    paramtype: RouteParamtypes;
    pipes: any[];
}

/**
 * Handles argument resolution and transformation for route handlers
 * 
 * @remarks
 * Resolves route parameters, query strings, body, headers etc.
 * and applies pipes for transformation/validation
 * 
 * @internal
 */
export class ArgumentResolver {
    /**
     * Resolves arguments from request context based on metadata
     * 
     * @param c - Hono context
     * @param argsMetadata - Pre-parsed argument metadata
     * @param pipes - Pipes to apply to arguments
     * @param executionContext - Execution context for guards/interceptors
     * @param moduleRef - Module reference for DI
     * @param contextId - Request context ID
     * @returns Array of resolved arguments
     */
    async resolveArgs(
        c: Context,
        argsMetadata: ParsedArgMetadata[],
        pipes: PipeTransform[],
        executionContext: ExecutionContext,
        moduleRef: Module,
        contextId: ContextId
    ): Promise<any[]> {
        const args: any[] = [];

        for (const metadata of argsMetadata) {
            let value: any;

            switch (metadata.paramtype) {
                case RouteParamtypes.BODY:
                    value = await c.req.json().catch(() => ({}));
                    if (metadata.data) {
                        value = value[metadata.data];
                    }
                    break;

                case RouteParamtypes.QUERY:
                    if (metadata.data) {
                        value = c.req.query(metadata.data);
                    } else {
                        value = c.req.query();
                    }
                    break;

                case RouteParamtypes.PARAM:
                    if (metadata.data) {
                        value = c.req.param(metadata.data);
                    } else {
                        value = c.req.param();
                    }
                    break;

                case RouteParamtypes.HEADERS:
                    if (metadata.data) {
                        value = c.req.header(metadata.data);
                    } else {
                        const headers: Record<string, string> = {};
                        c.req.raw.headers.forEach((val, key) => {
                            headers[key] = val;
                        });
                        value = headers;
                    }
                    break;

                case RouteParamtypes.CONTEXT:
                    value = c;
                    break;

                case RouteParamtypes.REQUEST:
                    value = c.req;
                    break;

                case RouteParamtypes.RESPONSE:
                    value = c.res;
                    break;

                default:
                    value = undefined;
            }

            // Apply pipes
            const allPipes = [...metadata.pipes, ...pipes];
            for (const pipe of allPipes) {
                value = await pipe.transform(value, {
                    type: metadata.paramtype,
                    data: metadata.data,
                    metatype: undefined
                });
            }

            args[metadata.index] = value;
        }

        return args;
    }
}
