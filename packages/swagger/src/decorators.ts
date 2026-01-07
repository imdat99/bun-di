import 'reflect-metadata';

export const DECORATORS_PREFIX = 'swagger';
export const DECORATORS = {
    API_TAGS: `${DECORATORS_PREFIX}/apiTags`,
    API_OPERATION: `${DECORATORS_PREFIX}/apiOperation`,
    API_RESPONSE: `${DECORATORS_PREFIX}/apiResponse`,
    API_PARAM: `${DECORATORS_PREFIX}/apiParam`,
    API_BODY: `${DECORATORS_PREFIX}/apiBody`,
    API_PROPERTY: `${DECORATORS_PREFIX}/apiProperty`,
};

export function ApiTags(...tags: string[]): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(DECORATORS.API_TAGS, tags, target);
    };
}

export function ApiOperation(options: { summary?: string; description?: string; deprecated?: boolean }): MethodDecorator {
    return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(DECORATORS.API_OPERATION, options, descriptor.value);
        return descriptor;
    };
}

export function ApiResponse(options: { status: number; description: string; type?: any }): MethodDecorator {
    return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        const responses = Reflect.getMetadata(DECORATORS.API_RESPONSE, descriptor.value) || {};
        responses[options.status] = options;
        Reflect.defineMetadata(DECORATORS.API_RESPONSE, responses, descriptor.value);
        return descriptor;
    };
}

export function ApiProperty(options: { description?: string; type?: any; required?: boolean; example?: any } = {}): PropertyDecorator {
    return (target: any, propertyKey: string | symbol) => {
        const properties = Reflect.getMetadata(DECORATORS.API_PROPERTY, target.constructor) || [];
        properties.push({ key: propertyKey, ...options });
        Reflect.defineMetadata(DECORATORS.API_PROPERTY, properties, target.constructor);
    };
}
