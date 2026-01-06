import type { Context } from 'hono';
import { Controller, Get } from '../core/decorators';

@Controller('health')
export class HealthController {
    @Get('/')
    check(c: Context) {
        return c.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
}
