import 'reflect-metadata';
import { METADATA_KEYS } from '../constants';

export function Inject(token: any): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
        if (!propertyKey) {
            // Constructor Injection
            // target is the Constructor
            const injections = Reflect.getMetadata(METADATA_KEYS.INJECTIONS, target) || [];
            injections[parameterIndex] = token;
            Reflect.defineMetadata(METADATA_KEYS.INJECTIONS, injections, target);
        } else {
            // Method Injection
            // target is the Prototype
            const constructor = target.constructor;
            let methodInjections = Reflect.getMetadata(METADATA_KEYS.METHOD_INJECTIONS, constructor);

            if (!methodInjections) {
                methodInjections = new Map<string | symbol, any[]>();
                Reflect.defineMetadata(METADATA_KEYS.METHOD_INJECTIONS, methodInjections, constructor);
            }

            let params = methodInjections.get(propertyKey);
            if (!params) {
                params = [];
                methodInjections.set(propertyKey, params);
            }

            params[parameterIndex] = token;
        }
    };
}

export function Optional(): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
        if (!propertyKey) {
            // Constructor Injection
            const optionals = Reflect.getMetadata(METADATA_KEYS.OPTIONAL, target) || [];
            optionals[parameterIndex] = true;
            Reflect.defineMetadata(METADATA_KEYS.OPTIONAL, optionals, target);
        } else {
            // Method Injection
            const constructor = target.constructor;
            let methodOptionals = Reflect.getMetadata(METADATA_KEYS.METHOD_OPTIONAL, constructor);

            if (!methodOptionals) {
                methodOptionals = new Map<string | symbol, boolean[]>();
                Reflect.defineMetadata(METADATA_KEYS.METHOD_OPTIONAL, methodOptionals, constructor);
            }

            let params = methodOptionals.get(propertyKey);
            if (!params) {
                params = [];
                methodOptionals.set(propertyKey, params);
            }

            params[parameterIndex] = true;
        }
    };
}
