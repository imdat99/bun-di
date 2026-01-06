import { ExceptionFilter, ArgumentsHost } from '../../core/interfaces';
import { HttpException } from '../exceptions/HttpException';
import { Catch } from '../../core/decorators';

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

        // Default 500
        console.error(exception);
        honoCtx.status(500);
        return honoCtx.json({
            statusCode: 500,
            message: 'Internal Server Error',
        });
    }
}
