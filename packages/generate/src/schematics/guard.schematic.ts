import { toPascalCase } from '../utils/name.utils';

export function generateGuard(name: string) {
    return `import { CanActivate, Injectable, ExecutionContext } from '@hono-di/core';
import { Observable } from 'rxjs';

@Injectable()
export class ${toPascalCase(name)}Guard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
`;
}
