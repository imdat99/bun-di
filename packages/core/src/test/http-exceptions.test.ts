import { describe, it, expect } from 'bun:test';
import { HonoDiFactory } from '../factory';
import { Module, Controller, Get } from '../decorators';
import {
    HttpException,
    BadRequestException,
    UnauthorizedException,
    NotFoundException,
    ForbiddenException,
    NotAcceptableException,
    RequestTimeoutException,
    ConflictException,
    GoneException,
    PayloadTooLargeException,
    UnsupportedMediaTypeException,
    UnprocessableEntityException,
    InternalServerErrorException,
    NotImplementedException,
    BadGatewayException,
    ServiceUnavailableException,
    GatewayTimeoutException
} from '../common/exceptions';

describe('HTTP Exceptions', () => {
    it('should throw HttpException with custom status', async () => {
        @Controller('/test')
        class TestController {
            @Get('/custom')
            custom() {
                throw new HttpException('Custom error', 418);
            }
        }

        @Module({ controllers: [TestController] })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const res = await app.getHttpAdapter().request('/test/custom');
        
        // Verify custom status code is returned
        expect(res.status).toBe(418);
    });

    it('should throw BadRequestException (400)', async () => {
        @Controller('/test')
        class TestController {
            @Get('/bad-request')
            badRequest() {
                throw new BadRequestException('Invalid input');
            }
        }

        @Module({ controllers: [TestController] })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const res = await app.getHttpAdapter().request('/test/bad-request');
        
        expect(res.status).toBe(400);
    });

    it('should throw UnauthorizedException (401)', async () => {
        @Controller('/test')
        class TestController {
            @Get('/unauthorized')
            unauthorized () {
                throw new UnauthorizedException();
            }
        }

        @Module({ controllers: [TestController] })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const res = await app.getHttpAdapter().request('/test/unauthorized');
        
        expect(res.status).toBe(401);
    });

    it('should throw NotFoundException (404)', async () => {
        @Controller('/test')
        class TestController {
            @Get('/not-found')
            notFound() {
                throw new NotFoundException('Resource not found');
            }
        }

        @Module({ controllers: [TestController] })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const res = await app.getHttpAdapter().request('/test/not-found');
        
        expect(res.status).toBe(404);
    });

    it('should throw ForbiddenException (403)', async () => {
        @Controller('/test')
        class TestController {
            @Get('/forbidden')
            forbidden() {
                throw new ForbiddenException();
            }
        }

        @Module({ controllers: [TestController] })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const res = await app.getHttpAdapter().request('/test/forbidden');
        
        expect(res.status).toBe(403);
    });

    it('should throw InternalServerErrorException (500)', async () => {
        @Controller('/test')
        class TestController {
            @Get('/error')
            error() {
                throw new InternalServerErrorException('Server error');
            }
        }

        @Module({ controllers: [TestController] })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const res = await app.getHttpAdapter().request('/test/error');
        
        expect(res.status).toBe(500);
    });

    it('should throw ConflictException (409)', async () => {
        @Controller('/test')
        class TestController {
            @Get('/conflict')
            conflict() {
                throw new ConflictException('Resource conflict');
            }
        }

        @Module({ controllers: [TestController] })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const res = await app.getHttpAdapter().request('/test/conflict');
        
        expect(res.status).toBe(409);
    });

    it('should throw ServiceUnavailableException (503)', async () => {
        @Controller('/test')
        class TestController {
            @Get('/unavailable')
            unavailable() {
                throw new ServiceUnavailableException();
            }
        }

        @Module({ controllers: [TestController] })
        class TestModule { }

        const app = await HonoDiFactory.create(TestModule);
        const res = await app.getHttpAdapter().request('/test/unavailable');
        
        expect(res.status).toBe(503);
    });
});
