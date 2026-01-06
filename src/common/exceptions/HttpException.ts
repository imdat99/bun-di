export class HttpException extends Error {
    constructor(
        private readonly response: string | object,
        private readonly status: number,
    ) {
        super();
        this.message = typeof response === 'string' ? response : JSON.stringify(response);
    }

    getResponse(): string | object {
        return this.response;
    }

    getStatus(): number {
        return this.status;
    }

    static createBody(message: object | string, error: string, statusCode: number) {
        if (!message) {
            return { statusCode, error };
        }
        return typeof message === 'object' && !Array.isArray(message)
            ? message
            : { statusCode, error, message };
    }
}

export class BadRequestException extends HttpException {
    constructor(message?: string | object | any, error = 'Bad Request') {
        super(
            HttpException.createBody(message, error, 400),
            400,
        );
    }
}

export class UnauthorizedException extends HttpException {
    constructor(message?: string | object | any, error = 'Unauthorized') {
        super(
            HttpException.createBody(message, error, 401),
            401,
        );
    }
}

export class NotFoundException extends HttpException {
    constructor(message?: string | object | any, error = 'Not Found') {
        super(
            HttpException.createBody(message, error, 404),
            404,
        );
    }
}

export class ForbiddenException extends HttpException {
    constructor(message?: string | object | any, error = 'Forbidden') {
        super(
            HttpException.createBody(message, error, 403),
            403,
        );
    }
}

export class InternalServerErrorException extends HttpException {
    constructor(message?: string | object | any, error = 'Internal Server Error') {
        super(
            HttpException.createBody(message, error, 500),
            500,
        );
    }
}
