import { ExceptionFilter, ArgumentsHost } from '../../interfaces';
import { HttpException } from '../exceptions/HttpException';
import { Catch } from '../../decorators';

@Catch()
export class BaseExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse(); // This would be the Hono Context object in our case, or a wrapper
        const honoCtx = ctx.getContext();

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const res = exception.getResponse();
            honoCtx.status(status as any);
            return honoCtx.json(res);
        }

        // Handle Error instances
        if (exception instanceof Error) {
            console.error(exception);
            honoCtx.status(500);
            return honoCtx.json({
                statusCode: 500,
                message: 'Internal Server Error',
                cause: exception.message
            });
        }

        // Handle non-Error exceptions
        console.error(exception);
        honoCtx.status(500);

        // Format error response based on exception type
        let errorMessage: string;
        if (typeof exception === 'symbol') {
            // Convert symbol to string representation
            errorMessage = exception.toString();
        } else if (exception === null || exception === undefined) {
            errorMessage = String(exception);
        } else if (typeof exception === 'object') {
            // For plain objects, stringify them
            errorMessage = JSON.stringify(exception);
        } else {
            // For primitives (string, number, boolean)
            errorMessage = String(exception);
        }

        return honoCtx.json({
            statusCode: 500,
            message: 'Internal Server Error',
            error: errorMessage
        });
    }
}

