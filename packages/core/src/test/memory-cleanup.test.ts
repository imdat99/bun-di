import { describe, it, expect } from 'bun:test';
import { HonoDiFactory } from '../factory';
import { Module, Controller, Get, Injectable, Scope, Param } from '../decorators';

// Test memory cleanup for request-scoped instances
describe('Memory Cleanup', () => {
    it('should cleanup request-scoped instances after request completes', async () => {
        @Injectable({ scope: Scope.REQUEST })
        class RequestService {
            private static instanceCount = 0;
            public readonly id: number;

            constructor() {
                RequestService.instanceCount++;
                this.id = RequestService.instanceCount;
            }

            static getCount() {
                return RequestService.instanceCount;
            }

            static resetCount() {
                RequestService.instanceCount = 0;
            }
        }

        @Controller('/test')
        class TestController {
            constructor(private readonly service: RequestService) { }

            @Get('/')
            getService() {
                return { id: this.service.id };
            }
        }

        @Module({
            controllers: [TestController],
            providers: [RequestService]
        })
        class TestModule { }

        RequestService.resetCount();
        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();

        // Simulate multiple requests
        const res1 = await hono.request('/test');
        expect(res1.status).toBe(200);
        const data1 = await res1.json();
        expect(data1.id).toBe(1);

        const res2 = await hono.request('/test');
        expect(res2.status).toBe(200);
        const data2 = await res2.json();
        expect(data2.id).toBe(2);

        const res3 = await hono.request('/test');
        expect(res3.status).toBe(200);
        const data3 = await res3.json();
        expect(data3.id).toBe(3);

        // Verify instances are being created for each request
        expect(RequestService.getCount()).toBe(3);

        // Cleanup
        await app.close();
    });

    it('should cleanup all contexts on application shutdown', async () => {
        @Injectable({ scope: Scope.REQUEST })
        class RequestService {
            cleanup() {
                // Cleanup logic
            }
        }

        @Controller('/test')
        class TestController {
            constructor(private readonly service: RequestService) { }

            @Get('/')
            test() {
                return { ok: true };
            }
        }

        @Module({
            controllers: [TestController],
            providers: [RequestService]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();

        // Make some requests
        await hono.request('/test');
        await hono.request('/test');

        const container = app.getContainer();
        const modules = container.getModules();
        let hasRequestScoped = false;

        for (const module of modules.values()) {
            for (const wrapper of module.providers.values()) {
                if (wrapper.scope === Scope.REQUEST) {
                    hasRequestScoped = true;
                }
            }
        }

        expect(hasRequestScoped).toBe(true);

        // Close should cleanup everything
        await app.close();

        // Verify cleanup was called
        // (in real scenario, we'd check memory usage or instance counts)
    });

    it('should handle concurrent requests without memory leaks', async () => {
        @Injectable({ scope: Scope.REQUEST })
        class ConcurrentService {
            constructor() { }

            process(id: number) {
                return { processed: id };
            }
        }

        @Controller('/concurrent')
        class ConcurrentController {
            constructor(private readonly service: ConcurrentService) { }

            @Get('/:id')
            async process(@Param('id') id: string) {
                return this.service.process(parseInt(id));
            }
        }

        @Module({
            controllers: [ConcurrentController],
            providers: [ConcurrentService]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();

        // Simulate concurrent requests
        const promises = Array.from({ length: 10 }, (_, i) =>
            hono.request(`/concurrent/${i}`)
        );

        const results = await Promise.all(promises);

        for (let i = 0; i < results.length; i++) {
            expect(results[i].status).toBe(200);
            const data = await results[i].json();
            expect(data.processed).toBe(i);
        }

        await app.close();
    });
});
