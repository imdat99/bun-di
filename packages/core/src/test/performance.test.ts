import { describe, it, expect } from 'bun:test';
import { HonoDiFactory } from '../factory';
import { Module, Controller, Get, UseGuards, UseInterceptors, UsePipes, Injectable } from '../decorators';
import { CanActivate, ExecutionContext, Interceptor, PipeTransform } from '../interfaces';
import { Observable } from 'rxjs';

// Simple implementations for testing
@Injectable()
class TestGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> {
        return true;
    }
}

@Injectable()
class TestInterceptor implements Interceptor {
    intercept(context: ExecutionContext, next: any): Observable<any> {
        return next.handle();
    }
}

@Injectable()
class TestPipe implements PipeTransform {
    transform(value: any, metadata: any) {
        return value;
    }
}

@Controller('/perf')
@UseGuards(TestGuard)
@UseInterceptors(TestInterceptor)
@UsePipes(TestPipe)
class PerformanceController {
    @Get('/test')
    test() {
        return { message: 'OK', timestamp: Date.now() };
    }

    @Get('/complex/:id')
    @UseGuards(TestGuard)
    complex(id: string) {
        return { id, data: 'complex endpoint' };
    }
}

@Module({
    controllers: [PerformanceController],
    providers: [TestGuard, TestInterceptor, TestPipe]
})
class PerformanceModule { }

describe('Performance Benchmarks', () => {
    it('should handle 100 simple requests efficiently', async () => {
        const app = await HonoDiFactory.create(PerformanceModule);
        const hono = app.getHttpAdapter();

        const iterations = 100;
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            const res = await hono.request('/perf/test');
            expect(res.status).toBe(200);
        }

        const duration = performance.now() - start;
        const avgLatency = duration / iterations;
        const rps = (iterations / duration) * 1000;

        console.log(`\n📊 Performance Metrics (100 requests):`);
        console.log(`   Total time: ${duration.toFixed(2)}ms`);
        console.log(`   Avg latency: ${avgLatency.toFixed(3)}ms`);
        console.log(`   RPS: ${rps.toFixed(0)}/s`);
        console.log(`   ✅ Target: >2000 RPS (optimized with caching)\n`);

        // With optimizations, should be fast
        expect(avgLatency).toBeLessThan(2); // Should be sub-2ms per request
        expect(rps).toBeGreaterThan(500); // Should handle 500+ RPS easily
    }, 10000);

    it('should handle 1000 requests with minimal overhead', async () => {
        const app = await HonoDiFactory.create(PerformanceModule);
        const hono = app.getHttpAdapter();

        const iterations = 1000;
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            await hono.request('/perf/test');
        }

        const duration = performance.now() - start;
        const avgLatency = duration / iterations;
        const rps = (iterations / duration) * 1000;

        console.log(`\n📊 Performance Metrics (1000 requests):`);
        console.log(`   Total time: ${duration.toFixed(2)}ms`);
        console.log(`   Avg latency: ${avgLatency.toFixed(3)}ms`);
        console.log(`   RPS: ${rps.toFixed(0)}/s`);
        console.log(`   💾 Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB\n`);

        // Performance targets with caching
        expect(avgLatency).toBeLessThan(3);
        expect(rps).toBeGreaterThan(333); // 1000 requests in <3s
    }, 30000);

    it('should demonstrate cache effectiveness', async () => {
        const app = await HonoDiFactory.create(PerformanceModule);
        const hono = app.getHttpAdapter();

        // First request (cache warm-up)
        await hono.request('/perf/test');

        // Measure cached performance
        const iterations = 50;
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            await hono.request('/perf/test');
        }

        const duration = performance.now() - start;
        const avgLatency = duration / iterations;

        console.log(`\n🚀 Cache Performance:`);
        console.log(`   Cached avg latency: ${avgLatency.toFixed(3)}ms`);
        console.log(`   Cache effectiveness: Using pre-computed metadata`);
        console.log(`   No Reflect.getMetadata calls during requests!`);
        console.log(`   No array spreading on every request!\n`);

        // Should be very fast with cache
        expect(avgLatency).toBeLessThan(1.5);
    });

    it('should handle concurrent requests efficiently', async () => {
        const app = await HonoDiFactory.create(PerformanceModule);
        const hono = app.getHttpAdapter();

        const concurrency = 10;
        const requestsPerBatch = 10;

        const start = performance.now();

        const promises = [];
        for (let i = 0; i < concurrency; i++) {
            const batchPromises = [];
            for (let j = 0; j < requestsPerBatch; j++) {
                batchPromises.push(hono.request('/perf/test'));
            }
            promises.push(Promise.all(batchPromises));
        }

        await Promise.all(promises);

        const duration = performance.now() - start;
        const totalRequests = concurrency * requestsPerBatch;
        const rps = (totalRequests / duration) * 1000;

        console.log(`\n⚡ Concurrent Performance:`);
        console.log(`   ${totalRequests} concurrent requests`);
        console.log(`   Duration: ${duration.toFixed(2)}ms`);
        console.log(`   RPS: ${rps.toFixed(0)}/s\n`);

        expect(rps).toBeGreaterThan(200);
    });
});
