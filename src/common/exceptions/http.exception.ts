
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

    static createBody(message: object | string | any, error: string, statusCode: number) {
        if (!message) {
            return { statusCode, error };
        }
        return typeof message === 'object' && !Array.isArray(message)
            ? message
            : { statusCode, error, message };
    }
}
