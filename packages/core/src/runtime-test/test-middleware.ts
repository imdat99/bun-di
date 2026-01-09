
import { HonoDiFactory } from '../factory';
import { Module, Controller, Get, Injectable } from '../decorators';
import { HonoDiMiddleware, HonoDiModule, MiddlewareConsumer } from '../interfaces';
import { Hono } from 'hono';

// --- Middleware ---
@Injectable()
class LoggerMiddleware implements HonoDiMiddleware {
    async use(c: any, next: () => Promise<void>) {
        console.log(`[Middleware] Request to ${c.req.path}`);
        c.req.raw.headers.set('x-middleware-ran', 'true');
        await next();
        console.log(`[Middleware] Response from ${c.req.path}`);
    }
}

// --- Controller ---
@Controller('middleware')
class MiddlewareController {
    @Get('test')
    test(c: any) {
        const middlewareRan = c.req.header('x-middleware-ran') === 'true';
        return { middlewareRan };
    }
}

// --- Module ---
@Module({
    controllers: [MiddlewareController],
    providers: [LoggerMiddleware],
})
class MiddlewareModule implements HonoDiModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(LoggerMiddleware)
            .forRoutes('middleware/test');
    }
}

// --- Test ---
async function runTest() {
    console.log('--- Testing Middleware ---');
    const app = new Hono();
    await HonoDiFactory.create(MiddlewareModule, app);

    const res = await app.request('/middleware/test', { method: 'GET' });
    const data = await res.json();
    
    console.log('Status:', res.status);
    console.log('Data:', data);

    if (res.status === 200 && data.middlewareRan === true) {
        console.log('✅ Middleware Test Passed');
    } else {
        console.error('❌ Middleware Test Failed');
        process.exit(1);
    }
}

runTest();
