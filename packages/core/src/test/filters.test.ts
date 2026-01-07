import { describe, it, expect } from 'bun:test';
import { Injectable, Module, Controller, Get, UseFilters, Catch, ExceptionFilter, ArgumentsHost, HonoDiFactory } from '../index';
import { HttpException } from '../common/exceptions';

class CustomError extends Error { }

@Catch(CustomError)
class CustomFilter implements ExceptionFilter {
    catch(exception: CustomError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        response.status(400);
        return response.json({ message: 'Custom Error Caught' });
    }
}

@Catch()
class GlobalFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        response.status(500);
        return response.json({ message: 'Global Error Caught' });
    }
}

@Controller('cats')
@UseFilters(CustomFilter)
class CatsController {
    @Get('error')
    throwError() {
        throw new CustomError('Boom');
    }

    @Get('global')
    throwGlobal() {
        throw new Error('Boom');
    }
}

@Module({
    controllers: [CatsController],
})
class AppModule { }

describe('Exception Filters', () => {
    it('should catch exceptions with controller-scoped filter', async () => {
        const app = await HonoDiFactory.create(AppModule);

        const res = await app.getHttpAdapter().request('http://localhost/cats/error');
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ message: 'Custom Error Caught' });
    });

    it('should fall back to global filter if not caught', async () => {
        const app = await HonoDiFactory.create(AppModule);
        app.useGlobalFilters(new GlobalFilter());

        const res = await app.getHttpAdapter().request('http://localhost/cats/global');
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ message: 'Global Error Caught' });
    });
});
