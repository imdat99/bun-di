
import { HonoDiFactory } from '../factory';
import { Module, Controller, Get, UseGuards, Injectable } from '../decorators';
import { ExceptionFilter, ArgumentsHost, PipeTransform, ArgumentMetadata, CanActivate, ExecutionContext, Interceptor, CallHandler } from '../interfaces';
import { Hono } from 'hono';

// --- Global Guard ---
@Injectable()
class GlobalGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        return req.header('x-global') === 'true';
    }
}

// --- Global Interceptor ---
@Injectable()
class GlobalInterceptor implements Interceptor {
    intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
        return next.handle().then(data => ({ ...data, global: true }));
    }
}

// --- Global Pipe ---
@Injectable()
class GlobalPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        // Simple transformation: if string, uppercase
        if (typeof value === 'string') return value.toUpperCase();
        return value;
    }
}

// --- Global Filter ---
@Injectable()
class GlobalFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const context = ctx.getContext();
        context.status(400);
        // response.status(400);
        return context.json({
            statusCode: 400,
            message: 'Global Error',
            error: exception.message
        });
    }
}

// --- Controller ---
@Controller('global')
class GlobalController {
    @Get()
    findAll() {
        return { message: 'hello' };
    }

    @Get('error')
    error() {
        throw new Error('Test Error');
    }
}

// --- Module ---
@Module({
    controllers: [GlobalController],
})
class AppModule { }

// --- Test ---
async function runTest() {
    const app = await HonoDiFactory.create(AppModule);

    app.useGlobalGuards(new GlobalGuard());
    app.useGlobalInterceptors(new GlobalInterceptor());
    app.useGlobalPipes(new GlobalPipe()); // Pipes need args to verify
    app.useGlobalFilters(new GlobalFilter());

    const hono = app.getHttpAdapter();

    // Test Global Guard (Fail)
    const res1 = await hono.request('/global', { method: 'GET' });
    console.log('Global Guard Fail:', res1.status); // Should be 403

    // Test Global Guard (Pass) & Interceptor
    const res2 = await hono.request('/global', {
        method: 'GET',
        headers: { 'x-global': 'true' }
    });
    const data2 = await res2.json();
    console.log('Global Guard Pass & Interceptor:', data2); // Should have global: true

    // Test Global Filter
    const res3 = await hono.request('/global/error', {
        method: 'GET',
        headers: { 'x-global': 'true' }
    });
    const data3 = await res3.json();
    console.log('Global Filter:', res3.status, data3); // Should be 400, Global Error
}

runTest();
