import { describe, it, expect } from 'bun:test';
import { HonoDiFactory } from '../factory';
import { Module, Controller, Get, Injectable, UseGuards, UseInterceptors, UsePipes, HttpCode, Header, Redirect } from '../decorators';
import type { CanActivate, ExecutionContext, Interceptor, CallHandler, PipeTransform } from '../interfaces';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

describe('Application Advanced Features', () => {
    it('should accept global guards without errors', async () => {
        @Injectable()
        class TestGuard implements CanActivate {
            canActivate(context: ExecutionContext): boolean {
                return true;
            }
        }

        @Controller('/test')
        class TestController {
            @Get('/')
            test() {
                return { success: true };
            }
        }

        @Module({
            controllers: [TestController],
            providers: [TestGuard]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        app.useGlobalGuards(new TestGuard());
        
        const hono = app.getHttpAdapter();
        const res = await hono.request('/test');
        
        // Verify request succeeds with global guard registered
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });

    it('should accept global interceptors without errors', async () => {
        @Injectable()
        class LoggingInterceptor implements Interceptor {
            intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
                return next.handle().pipe(
                    map(data => ({ ...data, logged: true }))
                );
            }
        }

        @Controller('/test')
        class TestController {
            @Get('/')
            test() {
                return { original: true };
            }
        }

        @Module({
            controllers: [TestController],
            providers: [LoggingInterceptor]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        app.useGlobalInterceptors(new LoggingInterceptor());
        
        const hono = app.getHttpAdapter();
        const res = await hono.request('/test');
        const data = await res.json();
        
        // Verify request succeeds with global interceptor registered
        expect(res.status).toBe(200);
        expect(data.original).toBe(true);
    });

    it('should execute global pipes for transformation', async () => {
        @Injectable()
        class UpperCasePipe implements PipeTransform {
            transform(value: any) {
                if (typeof value === 'string') {
                    return value.toUpperCase();
                }
                return value;
            }
        }

        @Controller('/test')
        class TestController {
            @Get('/')
            test(@UsePipes(new UpperCasePipe()) name: string = 'hello') {
                return { name };
            }
        }

        @Module({
            controllers: [TestController]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        app.useGlobalPipes(new UpperCasePipe());
        
        const hono = app.getHttpAdapter();
        const res = await hono.request('/test');
        
        expect(res.status).toBe(200);
    });

    it('should apply HttpCode decorator', async () => {
        @Controller('/test')
        class TestController {
            @Get('/created')
            @HttpCode(201)
            create() {
                return { created: true };
            }
        }

        @Module({
            controllers: [TestController]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();
        const res = await hono.request('/test/created');
        
        expect(res.status).toBe(201);
    });

    it('should apply Header decorator', async () => {
        @Controller('/test')
        class TestController {
            @Get('/custom')
            @Header('X-Custom-Header', 'test-value')
            custom() {
                return { success: true };
            }
        }

        @Module({
            controllers: [TestController]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();
        const res = await hono.request('/test/custom');
        
        expect(res.headers.get('X-Custom-Header')).toBe('test-value');
    });

    it('should apply Redirect decorator', async () => {
        @Controller('/test')
        class TestController {
            @Get('/old')
            @Redirect('/test/new', 301)
            old() {
                return {};
            }

            @Get('/new')
            newRoute() {
                return { redirected: true };
            }
        }

        @Module({
            controllers: [TestController]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const hono = app.getHttpAdapter();
        const res = await hono.request('/test/old', { redirect: 'manual' });
        
        expect(res.status).toBe(301);
        expect(res.headers.get('Location')).toContain('/test/new');
    });

    it('should call lifecycle hooks on shutdown', async () => {
        let beforeShutdownCalled = false;
        let onShutdownCalled = false;

        @Injectable()
        class LifecycleService {
            beforeApplicationShutdown() {
                beforeShutdownCalled = true;
            }

            onApplicationShutdown() {
                onShutdownCalled = true;
            }
        }

        @Module({
            providers: [LifecycleService]
        })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        await app.close();

        expect(beforeShutdownCalled).toBe(true);
        expect(onShutdownCalled).toBe(true);
    });
});
