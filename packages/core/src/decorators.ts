import 'reflect-metadata';
import { METADATA_KEYS } from './constants';
import { Scope } from './injector/scope';
import { RequestMethod } from './interfaces';
import type { ModuleOptions, Type, InjectionToken, CanActivate, ExceptionFilter, PipeTransform, Interceptor, ExecutionContext } from './interfaces';

export { Scope, RequestMethod };
export type { ModuleOptions };

export interface InjectableOptions {
    scope?: Scope;
}

export interface RouteDefinition {
    path: string;
    requestMethod: RequestMethod;
    methodName: string;
}

export function Global(): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(METADATA_KEYS.GLOBAL, true, target);
    };
}

export function Module(options: ModuleOptions): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(METADATA_KEYS.MODULE, options, target);
    };
}

export function Injectable(options?: InjectableOptions): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(METADATA_KEYS.SCOPE, options?.scope ?? Scope.DEFAULT, target);
    };
}

export function Controller(prefix: string = ''): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, { prefix }, target);
        // Mark as Injectable implicitly
        Reflect.defineMetadata(METADATA_KEYS.SCOPE, Scope.DEFAULT, target);
    };
}

// Method Decorators
function createRouteDecorator(method: RequestMethod) {
    return (path: string = '/'): MethodDecorator => {
        return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
            // In case of instance method decorator, target is the prototype
            if (!Reflect.hasMetadata(METADATA_KEYS.ROUTES, target.constructor)) {
                Reflect.defineMetadata(METADATA_KEYS.ROUTES, [], target.constructor);
            }

            const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, target.constructor) as RouteDefinition[];

            routes.push({
                requestMethod: method,
                path,
                methodName: propertyKey as string,
            });
            Reflect.defineMetadata(METADATA_KEYS.ROUTES, routes, target.constructor);
        };
    };
}

export const Get = createRouteDecorator(RequestMethod.GET);
export const Post = createRouteDecorator(RequestMethod.POST);
export const Put = createRouteDecorator(RequestMethod.PUT);
export const Delete = createRouteDecorator(RequestMethod.DELETE);
export const Patch = createRouteDecorator(RequestMethod.PATCH);
export const Options = createRouteDecorator(RequestMethod.OPTIONS);
export const Head = createRouteDecorator(RequestMethod.HEAD);
export const All = createRouteDecorator(RequestMethod.ALL);

// Exception Filters
export function Catch(...exceptions: Type<any>[]): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(METADATA_KEYS.FILTER_CATCH, exceptions, target);
        // Mark as Injectable implicitly
        Reflect.defineMetadata(METADATA_KEYS.SCOPE, Scope.DEFAULT, target);
    };
}

export function UseFilters(...filters: (Type<ExceptionFilter> | ExceptionFilter)[]): MethodDecorator & ClassDecorator {
    return (
        target: any,
        propertyKey?: string | symbol,
        descriptor?: PropertyDescriptor,
    ) => {
        if (descriptor) {
            // Method decorator
            Reflect.defineMetadata(METADATA_KEYS.USE_FILTERS, filters, descriptor.value);
            return descriptor;
        }
        // Class decorator
        Reflect.defineMetadata(METADATA_KEYS.USE_FILTERS, filters, target);
        return target;
    };
}

export function Inject(token: InjectionToken): PropertyDecorator & ParameterDecorator {
    return (target: Object, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
        if (parameterIndex !== undefined) {
            // Parameter decorator
            const injections = Reflect.getMetadata(METADATA_KEYS.INJECTIONS, target) || [];
            injections[parameterIndex] = token;
            Reflect.defineMetadata(METADATA_KEYS.INJECTIONS, injections, target);
        } else {
            // Property decorator
            const properties = Reflect.getMetadata(METADATA_KEYS.PROPERTY_DEPS, target.constructor) || [];
            properties.push({ key: propertyKey, token });
            Reflect.defineMetadata(METADATA_KEYS.PROPERTY_DEPS, properties, target.constructor);
        }
    };
}

export function Optional(): PropertyDecorator & ParameterDecorator {
    return (target: Object, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
        if (parameterIndex !== undefined) {
            // Parameter decorator
            const optionals = Reflect.getMetadata(METADATA_KEYS.OPTIONAL, target) || [];
            optionals[parameterIndex] = true;
            Reflect.defineMetadata(METADATA_KEYS.OPTIONAL, optionals, target);
        } else {
            // Property decorator
            const optionalProps = Reflect.getMetadata(METADATA_KEYS.OPTIONAL, target.constructor) || [];
            optionalProps.push(propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.OPTIONAL, optionalProps, target.constructor);
        }
    };
}

export function UseGuards(...guards: (Type<CanActivate> | CanActivate)[]): MethodDecorator & ClassDecorator {
    return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(METADATA_KEYS.USE_GUARDS, guards, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(METADATA_KEYS.USE_GUARDS, guards, target);
        return target;
    };
}

export function UseInterceptors(...interceptors: (Type<Interceptor> | Interceptor)[]): MethodDecorator & ClassDecorator {
    return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(METADATA_KEYS.USE_INTERCEPTORS, interceptors, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(METADATA_KEYS.USE_INTERCEPTORS, interceptors, target);
        return target;
    };
}

export function UsePipes(...pipes: (Type<PipeTransform> | PipeTransform)[]): MethodDecorator & ClassDecorator {
    return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(METADATA_KEYS.USE_PIPES, pipes, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(METADATA_KEYS.USE_PIPES, pipes, target);
        return target;
    };
}

export enum RouteParamtypes {
    REQUEST,
    RESPONSE,
    NEXT,
    BODY,
    QUERY,
    PARAM,
    HEADERS,
    SESSION,
    FILE,
    FILES,
    HOST,
    IP,
    CONTEXT,
    CUSTOM,
}

export function assignMetadata(args: any, paramtype: RouteParamtypes, index: number, data?: any, ...pipes: any[]) {
    return {
        ...args,
        [`${paramtype}:${index}`]: {
            index,
            data,
            pipes,
            paramtype,
        },
    };
}

function createRouteParamDecorator(paramtype: RouteParamtypes) {
    return (data?: any): ParameterDecorator => {
        return (target: Object, key: string | symbol | undefined, index: number) => {
            const args = Reflect.getMetadata(METADATA_KEYS.ROUTE_ARGS_METADATA, target.constructor, key as string | symbol) || {};
            Reflect.defineMetadata(
                METADATA_KEYS.ROUTE_ARGS_METADATA,
                assignMetadata(args, paramtype, index, data),
                target.constructor,
                key as string | symbol,
            );
        };
    };
}

function createPipesRouteParamDecorator(paramtype: RouteParamtypes) {
    return (data?: any, ...pipes: any[]): ParameterDecorator => {
        return (target: Object, key: string | symbol | undefined, index: number) => {
            const args = Reflect.getMetadata(METADATA_KEYS.ROUTE_ARGS_METADATA, target.constructor, key as string | symbol) || {};
            Reflect.defineMetadata(
                METADATA_KEYS.ROUTE_ARGS_METADATA,
                assignMetadata(args, paramtype, index, data, ...pipes),
                target.constructor,
                key as string | symbol,
            );
        };
    };
}

export const Request = createRouteParamDecorator(RouteParamtypes.REQUEST);
export const Response = createRouteParamDecorator(RouteParamtypes.RESPONSE);
export const Next = createRouteParamDecorator(RouteParamtypes.NEXT);
export const Session = createRouteParamDecorator(RouteParamtypes.SESSION);
export const FileParam = createRouteParamDecorator(RouteParamtypes.FILE);
export const Files = createRouteParamDecorator(RouteParamtypes.FILES);
export const Ip = createRouteParamDecorator(RouteParamtypes.IP);
export const HostParam = createRouteParamDecorator(RouteParamtypes.HOST);
export const Ctx = createRouteParamDecorator(RouteParamtypes.CONTEXT);

export function Body(property?: string, ...pipes: any[]): ParameterDecorator {
    return createPipesRouteParamDecorator(RouteParamtypes.BODY)(property, ...pipes);
}

export function Query(property?: string, ...pipes: any[]): ParameterDecorator {
    return createPipesRouteParamDecorator(RouteParamtypes.QUERY)(property, ...pipes);
}

export function Param(property?: string, ...pipes: any[]): ParameterDecorator {
    return createPipesRouteParamDecorator(RouteParamtypes.PARAM)(property, ...pipes);
}

export function Headers(property?: string, ...pipes: any[]): ParameterDecorator {
    return createPipesRouteParamDecorator(RouteParamtypes.HEADERS)(property, ...pipes);
}

export function SetMetadata<K = any, V = any>(metadataKey: K, metadataValue: V): CustomDecorator<K> {
    return (target: object, key?: string | symbol, descriptor?: any) => {
        if (descriptor) {
            Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(metadataKey, metadataValue, target);
        return target;
    };
}

export type CustomDecorator<TKey = string> = MethodDecorator & ClassDecorator;

export function HttpCode(statusCode: number): MethodDecorator {
    return (target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
        Reflect.defineMetadata(METADATA_KEYS.HTTP_CODE, statusCode, descriptor.value);
        return descriptor;
    };
}

export function Header(name: string, value: string): MethodDecorator {
    return (target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
        const headers = Reflect.getMetadata(METADATA_KEYS.HEADERS, descriptor.value) || [];
        headers.push({ name, value });
        Reflect.defineMetadata(METADATA_KEYS.HEADERS, headers, descriptor.value);
        return descriptor;
    };
}

export function Redirect(url: string, statusCode: number = 302): MethodDecorator {
    return (target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
        Reflect.defineMetadata(METADATA_KEYS.REDIRECT, { url, statusCode }, descriptor.value);
        return descriptor;
    };
}

export function applyDecorators(...decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator>) {
    return <TFunction extends Function, Y>(
        target: object | TFunction,
        propertyKey?: string | symbol,
        descriptor?: TypedPropertyDescriptor<Y>,
    ) => {
        for (const decorator of decorators) {
            if (target instanceof Function && !descriptor) {
                (decorator as ClassDecorator)(target);
                continue;
            }
            if (descriptor) {
                (decorator as MethodDecorator)(target, propertyKey!, descriptor);
            } else {
                (decorator as PropertyDecorator)(target, propertyKey!);
            }
        }
    };
}
export function createParamDecorator<FactoryData = any, Output = any>(
    factory: (data: FactoryData, ctx: ExecutionContext) => Output,
) {
    const paramtype = RouteParamtypes.CUSTOM;
    return (data?: FactoryData): ParameterDecorator => {
        return (target: Object, key: string | symbol | undefined, index: number) => {
            const args = Reflect.getMetadata(METADATA_KEYS.ROUTE_ARGS_METADATA, target.constructor, key as string | symbol) || {};
            Reflect.defineMetadata(
                METADATA_KEYS.ROUTE_ARGS_METADATA,
                assignMetadata(args, paramtype, index, data, factory),
                target.constructor,
                key as string | symbol,
            );
        };
    };
}
