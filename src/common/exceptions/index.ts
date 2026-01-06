
import { HttpException } from './http.exception';
export { HttpException };

export class BadRequestException extends HttpException {
    constructor(message?: string | object | any, error = 'Bad Request') {
        super(HttpException.createBody(message, error, 400), 400);
    }
}

export class UnauthorizedException extends HttpException {
    constructor(message?: string | object | any, error = 'Unauthorized') {
        super(HttpException.createBody(message, error, 401), 401);
    }
}

export class NotFoundException extends HttpException {
    constructor(message?: string | object | any, error = 'Not Found') {
        super(HttpException.createBody(message, error, 404), 404);
    }
}

export class ForbiddenException extends HttpException {
    constructor(message?: string | object | any, error = 'Forbidden') {
        super(HttpException.createBody(message, error, 403), 403);
    }
}

export class NotAcceptableException extends HttpException {
    constructor(message?: string | object | any, error = 'Not Acceptable') {
        super(HttpException.createBody(message, error, 406), 406);
    }
}

export class RequestTimeoutException extends HttpException {
    constructor(message?: string | object | any, error = 'Request Timeout') {
        super(HttpException.createBody(message, error, 408), 408);
    }
}

export class ConflictException extends HttpException {
    constructor(message?: string | object | any, error = 'Conflict') {
        super(HttpException.createBody(message, error, 409), 409);
    }
}

export class GoneException extends HttpException {
    constructor(message?: string | object | any, error = 'Gone') {
        super(HttpException.createBody(message, error, 410), 410);
    }
}

export class PayloadTooLargeException extends HttpException {
    constructor(message?: string | object | any, error = 'Payload Too Large') {
        super(HttpException.createBody(message, error, 413), 413);
    }
}

export class UnsupportedMediaTypeException extends HttpException {
    constructor(message?: string | object | any, error = 'Unsupported Media Type') {
        super(HttpException.createBody(message, error, 415), 415);
    }
}

export class UnprocessableEntityException extends HttpException {
    constructor(message?: string | object | any, error = 'Unprocessable Entity') {
        super(HttpException.createBody(message, error, 422), 422);
    }
}

export class InternalServerErrorException extends HttpException {
    constructor(message?: string | object | any, error = 'Internal Server Error') {
        super(HttpException.createBody(message, error, 500), 500);
    }
}

export class NotImplementedException extends HttpException {
    constructor(message?: string | object | any, error = 'Not Implemented') {
        super(HttpException.createBody(message, error, 501), 501);
    }
}

export class BadGatewayException extends HttpException {
    constructor(message?: string | object | any, error = 'Bad Gateway') {
        super(HttpException.createBody(message, error, 502), 502);
    }
}

export class ServiceUnavailableException extends HttpException {
    constructor(message?: string | object | any, error = 'Service Unavailable') {
        super(HttpException.createBody(message, error, 503), 503);
    }
}

export class GatewayTimeoutException extends HttpException {
    constructor(message?: string | object | any, error = 'Gateway Timeout') {
        super(HttpException.createBody(message, error, 504), 504);
    }
}
