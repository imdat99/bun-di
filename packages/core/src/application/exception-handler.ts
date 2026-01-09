import { Context } from 'hono';
import { StatusCode } from 'hono/utils/http-status';
import { ExecutionContextHost } from '../execution-context-host';
import { HttpException } from '../common/exceptions';
import { Logger } from '../services/logger.service';
import { METADATA_KEYS } from '../constants';
import type { ExceptionFilter } from '../interfaces';
import { Module } from '../injector/module';
import { ContextId } from '../injector/context-id';

/**
 * Handles exception filtering and response formatting
 * 
 * @internal
 */
export class ExceptionHandler {
    private readonly logger = new Logger('ExceptionHandler');

    /**
     * Handles an exception through the filter chain
     * 
     * @param exception - The exception to handle
     * @param c - Hono context
     * @param controllerClass - Controller class
     * @param methodName - Handler method name
     * @param moduleRef - Module reference
     * @param contextId - Context ID
     * @param globalFilters - Global exception filters
     * @param resolveFilters - Function to resolve filters
     * @returns Response from filter or default error response
     */
    async handle(
        exception: any,
        c: Context,
        controllerClass: any,
        methodName: string,
        moduleRef: Module,
        contextId: ContextId,
        globalFilters: ExceptionFilter[],
        resolveFilters: (filters: any[], moduleRef: Module, contextId: ContextId) => Promise<any[]>
    ) {
        // Get all applicable filters (method > controller > global)
        const filters = await resolveFilters(
            [
                ...(Reflect.getMetadata(METADATA_KEYS.USE_FILTERS, (moduleRef.controllers.get(controllerClass)?.instance as any)?.[methodName]) || []),
                ...(Reflect.getMetadata(METADATA_KEYS.USE_FILTERS, controllerClass) || []),
                ...globalFilters
            ],
            moduleRef,
            contextId
        );

        // Try to find a matching filter
        for (const filter of filters) {
            const catchExceptions = Reflect.getMetadata(METADATA_KEYS.FILTER_CATCH, filter.constructor) || [];
            if (catchExceptions.length === 0 || catchExceptions.some((e: any) => exception instanceof e)) {
                const host = new ExecutionContextHost(
                    [c],
                    controllerClass,
                    (moduleRef.controllers.get(controllerClass)?.instance as any)?.[methodName]
                );
                return await filter.catch(exception, host);
            }
        }

        // No filter matched - handle with default behavior
        return this.handleDefault(exception, c);
    }

    /**
     * Default exception handling when no filter matches
     */
    private async handleDefault(exception: any, c: Context) {
        this.logger.error(exception);

        // HttpException - return structured response
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const response = exception.getResponse();
            c.status(status as StatusCode);
            return c.json(response);
        }

        // Standard Error
        if (exception instanceof Error) {
            c.status(500);
            return c.json({
                statusCode: 500,
                message: 'Internal Server Error',
                cause: exception.message
            });
        }

        // Unknown exception type
        c.status(500);
        return c.json({
            statusCode: 500,
            message: 'Internal Server Error',
            error: String(exception)
        });
    }
}
