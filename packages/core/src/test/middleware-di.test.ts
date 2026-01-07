import { describe, it, expect, mock } from 'bun:test';
import { Injectable, Module, MiddlewareConsumer, HonoDiModule, HonoDiFactory, Inject, Controller, Get } from '../index';

@Injectable()
class LoggerService {
    log(message: string) {
        return message;
    }
}

@Injectable()
class LoggerMiddleware {
    constructor(private logger: LoggerService) { }

    use(c: any, next: any) {
        c.set('log', this.logger.log('test'));
        return next();
    }
}

@Controller('test')
class TestController {
    @Get()
    get(c: any) {
        return { log: c.get('log') };
    }
}

@Module({
    controllers: [TestController],
    providers: [LoggerService],
})
class TestModule implements HonoDiModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('test');
    }
}

describe('Middleware DI', () => {
    it('should inject dependencies into middleware from the same module', async () => {
        const app = await HonoDiFactory.create(TestModule);

        const req = new Request('http://localhost/test');
        const res = await app.getHttpAdapter().fetch(req);
        const data = await res.json();

        expect(data).toEqual({ log: 'test' });
    });
});
