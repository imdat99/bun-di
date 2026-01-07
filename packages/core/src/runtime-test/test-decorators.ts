
// import { BunDIFactory } from './core/factory';
import { Module, Controller, Get, HttpCode, Header, Redirect } from '../decorators';
import { HonoDiFactory } from '../factory';

// import { Controller } from "../decorators";

@Controller('decorators')
class DecoratorController {
    @Get('code')
    @HttpCode(202)
    code() {
        return { status: 'accepted' };
    }

    @Get('header')
    @Header('x-custom', 'test-value')
    header() {
        return { header: 'set' };
    }

    @Get('redirect')
    @Redirect('https://example.com', 301)
    redirect() {
        return;
    }

    @Get('redirect-override')
    @Redirect('https://example.com', 301)
    redirectOverride() {
        return { url: 'https://google.com', statusCode: 302 };
    }
}

@Module({
    controllers: [DecoratorController],
})
class AppModule { }

async function runTest() {
    const app = await HonoDiFactory.create(AppModule);
    const hono = app.getHttpAdapter();

    // Test HttpCode
    const res1 = await hono.request('/decorators/code', { method: 'GET' });
    console.log('HttpCode:', res1.status); // Should be 202

    // Test Header
    const res2 = await hono.request('/decorators/header', { method: 'GET' });
    console.log('Header:', res2.headers.get('x-custom')); // Should be test-value

    // Test Redirect
    const res3 = await hono.request('/decorators/redirect', { method: 'GET', redirect: 'manual' });
    console.log('Redirect:', res3.status, res3.headers.get('location')); // Should be 301, https://example.com

    // Test Redirect Override
    const res4 = await hono.request('/decorators/redirect-override', { method: 'GET', redirect: 'manual' });
    console.log('Redirect Override:', res4.status, res4.headers.get('location')); // Should be 302, https://google.com
}

runTest();
