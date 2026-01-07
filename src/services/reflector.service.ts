
import { Injectable } from '../decorators';
import { Type } from '../interfaces';

@Injectable()
export class Reflector {
    get<TResult = any, TKey = any>(metadataKey: TKey, target: Type<any> | Function): TResult {
        return Reflect.getMetadata(metadataKey, target) as TResult;
    }

    getAllAndOverride<TResult = any, TKey = any>(metadataKey: TKey, targets: (Type<any> | Function)[]): TResult {
        for (const target of targets) {
            const result = Reflect.getMetadata(metadataKey, target);
            if (result !== undefined) {
                return result as TResult;
            }
        }
        return undefined as any;
    }

    getAllAndMerge<TResult = any[], TKey = any>(metadataKey: TKey, targets: (Type<any> | Function)[]): TResult {
        const result: any[] = [];
        for (const target of targets) {
            const metadata = Reflect.getMetadata(metadataKey, target);
            if (metadata) {
                if (Array.isArray(metadata)) {
                    result.push(...metadata);
                } else {
                    result.push(metadata);
                }
            }
        }
        return result as TResult;
    }
}
