import { describe, it, expect } from 'bun:test';
import { HonoDiFactory } from '../factory';
import { Module, Controller, Get } from '../decorators';

// Test exception handler edge cases
describe('Exception Edge Cases', () => {
    it('should handle non-Error, non-HttpException exceptions', async () => {
        @Controller('/test')
        class TestController {
            @Get('/string-error')
            throwString() {
                throw 'This is a string error';
            }
        }

        @Module({
            controllers: [TestController]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();

        const res = await hono.request('/test/string-error');
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.statusCode).toBe(500);
        expect(data.message).toBe('Internal Server Error');
        expect(data.error).toContain('string error');
    });

    it('should handle null exceptions', async () => {
        @Controller('/test')
        class TestController {
            @Get('/null-error')
            throwNull() {
                throw null;
            }
        }

        @Module({
            controllers: [TestController]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();

        const res = await hono.request('/test/null-error');
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.statusCode).toBe(500);
        expect(data.message).toBe('Internal Server Error');
    });

    it('should handle undefined exceptions', async () => {
        @Controller('/test')
        class TestController {
            @Get('/undefined-error')
            throwUndefined() {
                throw undefined;
            }
        }

        @Module({
            controllers: [TestController]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();

        const res = await hono.request('/test/undefined-error');
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.statusCode).toBe(500);
        expect(data.message).toBe('Internal Server Error');
    });

    it('should handle object exceptions', async () => {
        @Controller('/test')
        class TestController {
            @Get('/object-error')
            throwObject() {
                throw { custom: 'error', code: 'CUSTOM_ERROR' };
            }
        }

        @Module({
            controllers: [TestController]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();

        const res = await hono.request('/test/object-error');
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.statusCode).toBe(500);
        expect(data.message).toBe('Internal Server Error');
        expect(data.error).toBeDefined();
    });

    it('should handle number exceptions', async () => {
        @Controller('/test')
        class TestController {
            @Get('/number-error')
            throwNumber() {
                throw 404;
            }
        }

        @Module({
            controllers: [TestController]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();

        const res = await hono.request('/test/number-error');
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.statusCode).toBe(500);
        expect(data.error).toBe('404');
    });

    it('should handle symbol exceptions', async () => {
        @Controller('/test')
        class TestController {
            @Get('/symbol-error')
            throwSymbol() {
                throw Symbol('error');
            }
        }

        @Module({
            controllers: [TestController]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();

        const res = await hono.request('/test/symbol-error');
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.statusCode).toBe(500);
        expect(data.error).toContain('Symbol');
    });

    it('should still handle standard Error correctly', async () => {
        @Controller('/test')
        class TestController {
            @Get('/standard-error')
            throwError() {
                throw new Error('Standard error message');
            }
        }

        @Module({
            controllers: [TestController]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();

        const res = await hono.request('/test/standard-error');
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.statusCode).toBe(500);
        expect(data.message).toBe('Internal Server Error');
        expect(data.cause).toBe('Standard error message');
    });
});
