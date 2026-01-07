import type { Context } from 'hono';
import { Controller, Get, UseFilters, Catch } from 'hono-di';
import { BadRequestException } from 'hono-di';
import { BaseExceptionFilter } from 'hono-di';
import { ExceptionFilter, ArgumentsHost } from 'hono-di';

@Catch(BadRequestException)
class BadRequestFilter implements ExceptionFilter {
    catch(exception: BadRequestException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const context = ctx.getContext();

        context.status(400);
        return context.json({
            custom: 'This is a custom Bad Request filter',
            message: exception.message
        });
    }
}

@Controller('example')
@UseFilters(BadRequestFilter)
export class ExampleController {

    @Get('/error')
    throwError(c: Context) {
        throw new BadRequestException('Something went wrong!');
    }

    @Get('/standard')
    standardError(c: Context) {
        // This should be caught by BaseExceptionFilter if not intercepted
        throw new Error('Random error');
    }
}
