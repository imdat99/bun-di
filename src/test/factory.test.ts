import { describe, expect, test, mock } from 'bun:test';
import 'reflect-metadata';
import { HonoDiFactory } from '../factory';
import { Module, Controller, Get } from '../decorators';
import { Hono } from 'hono';

describe('HonoDiFactory', () => {
    test('create should return an application instance resolved from container', async () => {
        @Controller('test')
        class TestController {
            @Get()
            index() { return 'ok'; }
        }

        @Module({
            controllers: [TestController]
        })
        class AppModule {}

        const app = await HonoDiFactory.create(AppModule);
        
        expect(app).toBeDefined();
        // app is HonoDiApplication instance
        // checking the private 'app' property (Hono instance)
        expect((app as any).app).toBeDefined();
        expect((app as any).app).toBeInstanceOf(Hono);
    });

    test('should register routes from controller', async () => {
        @Controller('api')
        class TestController {
            @Get('hello')
            hello() { return 'world'; }
        }

        @Module({
            controllers: [TestController]
        })
        class AppModule {}

        const app = await HonoDiFactory.create(AppModule);
        const hono = (app as any).app as Hono;
        
        // Hono internal router check usually complex, but we can try a request
        const req = new Request('http://localhost/api/hello');
        const res = await hono.request(req);
        
        expect(res.status).toBe(200);
        expect(await res.json()).toBe('world'); // Controller returns string, converted to JSON by HonoDi logic
        // HonoDiApplication wraps handler result. If return string, Hono returns it.
    });
});
