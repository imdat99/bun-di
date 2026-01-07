import { CanActivate, ExecutionContext, Injectable, Reflector } from '@hono-di/core';
import { IS_PUBLIC_KEY } from './decorators';

@Injectable()
export abstract class AuthGuard implements CanActivate {
    constructor(protected readonly reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        return this.validateRequest(context);
    }

    abstract validateRequest(context: ExecutionContext): boolean | Promise<boolean>;
}
