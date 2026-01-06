
import { BunDIFactory } from './core/factory';
import { Module, Injectable, Controller, Get } from './core/decorators';
import { NestModule, MiddlewareConsumer, NestMiddleware } from './core/interfaces';

@Injectable()
class LoggerMiddleware implements NestMiddleware {
    use(req: any, res: any, next: () => void) {
        console.log('LoggerMiddleware executing...');
        next();
    }
}

function functionalMiddleware(req: any, res: any, next: () => void) {
    console.log('FunctionalMiddleware executing...');
    next();
}

@Controller('middleware')
class MiddlewareController {
    @Get()
    test() {
        return { message: 'Middleware Test' };
    }
}

@Module({
    controllers: [MiddlewareController],
    providers: [LoggerMiddleware],
})
class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(LoggerMiddleware, functionalMiddleware)
            .forRoutes('/middleware');
    }
}

async function runTest() {
    const app = await BunDIFactory.create(AppModule);
    const hono = app.getHttpAdapter();

    console.log('Sending request to /middleware...');
    const res = await hono.request('/middleware', { method: 'GET' });
    const data = await res.json();
    console.log('Result:', data);
}

runTest();
