import { toPascalCase } from '../utils/name.utils';

export function generateInterceptor(name: string) {
    return `import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@hono-di/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ${toPascalCase(name)}Interceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => data));
  }
}
`;
}
