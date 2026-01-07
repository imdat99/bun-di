import { describe, it, expect, mock } from 'bun:test';
import { AuthGuard } from '../src/auth.guard';
import { Reflector, ExecutionContext } from '@hono-di/core';

class MockAuthGuard extends AuthGuard {
    validateRequest(context: ExecutionContext): boolean {
        return true;
    }
}

describe('AuthGuard', () => {
    it('should allow public routes', async () => {
        const reflector = new Reflector();
        // Mock getAllAndOverride on the instance
        reflector.getAllAndOverride = () => true;

        const guard = new MockAuthGuard(reflector);
        const context = {
            getHandler: () => function handler() { },
            getClass: () => class Controller { },
        } as any;

        expect(await guard.canActivate(context)).toBe(true);
    });

    it('should validate request if not public', async () => {
        const reflector = new Reflector();
        reflector.getAllAndOverride = () => false;

        const guard = new MockAuthGuard(reflector);
        const context = {
            getHandler: () => function handler() { },
            getClass: () => class Controller { },
        } as any;

        expect(await guard.canActivate(context)).toBe(true);
    });
});
