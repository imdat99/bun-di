
import { HonoDiFactory } from '../factory';
import { Module, Controller, Get, UseInterceptors, Injectable } from '../decorators';
import { Interceptor, ExecutionContext, CallHandler } from '../interfaces';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';

@Injectable()
class LoggingInterceptor implements Interceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        console.log('Before...');
        const now = Date.now();
        return next
            .handle()
            .pipe(
                tap(() => console.log(`After... ${Date.now() - now}ms`)),
            );
    }
}

@Injectable()
class TransformInterceptor implements Interceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next
            .handle()
            .pipe(
                map(data => ({ data })),
            );
    }
}

@Controller('rxjs')
@UseInterceptors(LoggingInterceptor, TransformInterceptor)
class RxJsController {
    @Get()
    test() {
        return 'RxJS Test';
    }
}

@Module({
    controllers: [RxJsController],
    providers: [LoggingInterceptor, TransformInterceptor],
})
class AppModule { }

async function runTest() {
    const app = await HonoDiFactory.create(AppModule);
    const hono = app.getHttpAdapter();

    console.log('Sending request to /rxjs...');
    const res = await hono.request('/rxjs', { method: 'GET' });
    const data = await res.json();
    console.log('Result:', data);
}

runTest();
