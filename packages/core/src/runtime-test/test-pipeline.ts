
import { HonoDiFactory } from '../factory';
import { Module, Controller, Get, Post, Body, Query, Param, UseGuards, UseInterceptors, UsePipes, Injectable } from '../decorators';
import { CanActivate, Interceptor, PipeTransform, ExecutionContext, CallHandler } from '../interfaces';
import { Hono } from 'hono';
import { expect } from 'bun:test';

// --- Guards ---
@Injectable()
class AuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        return req.header('authorization') === 'secret';
    }
}

// --- Interceptors ---
@Injectable()
class LoggingInterceptor implements Interceptor {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
        console.log('Before...');
        const now = Date.now();
        const result = await next.handle();
        console.log(`After... ${Date.now() - now}ms`);
        return { ...result, timestamp: now };
    }
}

// --- Pipes ---
@Injectable()
class ParseIntPipe implements PipeTransform {
    transform(value: any, metadata: any) {
        const val = parseInt(value, 10);
        if (isNaN(val)) {
            throw new Error('Validation failed');
        }
        return val;
    }
}

// --- Controller ---
@Controller('cats')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
class CatsController {
    @Get()
    findAll(@Query('limit', ParseIntPipe) limit: number) {
        return { cats: [], limit };
    }

    @Post()
    create(@Body() createCatDto: any) {
        return { created: true, ...createCatDto };
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return { id };
    }
}

// --- Module ---
@Module({
    controllers: [CatsController],
    providers: [AuthGuard, LoggingInterceptor, ParseIntPipe],
})
class AppModule { }

// --- Test ---
async function runTest() {
    const app = new Hono();
    await HonoDiFactory.create(AppModule, app);

    // Test Guard (Fail)
    const res1 = await app.request('/cats', { method: 'GET' });
    console.log('Guard Fail Status:', res1.status); // Should be 403
    if (res1.status === 404) console.log('Guard Fail 404 Body:', await res1.text());

    // Test Guard (Pass) & Pipe & Interceptor
    const res2 = await app.request('/cats?limit=10', {
        method: 'GET',
        headers: { authorization: 'secret' }
    });
    if (res2.status !== 200) {
        console.log('Guard Pass Failed:', res2.status, res2.constructor.name);
        try {
            console.log('Body:', await res2.text());
        } catch (e) {
            console.log('Body read failed:', e);
        }
    } else {
        const data2 = await res2.json();
        console.log('Guard Pass Data:', data2); // Should have limit: 10 and timestamp
    }

    // Test Body
    const res3 = await app.request('/cats', {
        method: 'POST',
        headers: {
            authorization: 'secret',
            'content-type': 'application/json'
        },
        body: JSON.stringify({ name: 'Tom' })
    });
    if (res3.status !== 200 && res3.status !== 201) {
        console.log('Post Failed:', res3.status, await res3.text());
    } else {
        const data3 = await res3.json();
        console.log('Post Data:', data3); // Should have name: Tom
    }

    // Test Param
    const res4 = await app.request('/cats/123', {
        method: 'GET',
        headers: { authorization: 'secret' }
    });
    if (res4.status !== 200) {
        console.log('Param Failed:', res4.status, await res4.text());
    } else {
        const data4 = await res4.json();
        console.log('Param Data:', data4); // Should have id: 123
    }
}

runTest();
