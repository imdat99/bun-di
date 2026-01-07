import { describe, expect, test, beforeEach } from 'bun:test';
import { Controller, Get, Module } from '../decorators';
import { HonoDiFactory } from '../factory';
import { Hono } from 'hono';

@Controller('cats')
class CatsController {
    @Get()
    findAll() {
        return 'cats';
    }
}

@Module({
    controllers: [CatsController],
})
class AppModule {}

describe('Global Prefix', () => {
    test('should apply global prefix when using autoInit: false', async () => {
        const hono = new Hono();
        const app = await HonoDiFactory.create(AppModule, { app: hono, autoInit: false });
        
        app.setGlobalPrefix('/api/v1');
        await app.init();

        const res = await hono.request(new Request('http://localhost/api/v1/cats'));
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('"cats"');
    });

    test('should NOT apply global prefix if autoInit: true (default) is used before setting prefix', async () => {
        const hono = new Hono();
        const app = await HonoDiFactory.create(AppModule, { app: hono }); // Default autoInit: true
        
        app.setGlobalPrefix('/api/v1');
        await app.init(); // Already initialized, does nothing

        const res = await hono.request(new Request('http://localhost/api/v1/cats'));
        expect(res.status).toBe(404);

        const resDefault = await hono.request(new Request('http://localhost/cats'));
        expect(resDefault.status).toBe(200);
    });
});
