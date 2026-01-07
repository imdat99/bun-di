
import { Type, ForwardReference } from './interfaces';

export function forwardRef(fn: () => Type<any>): ForwardReference {
    return { forwardRef: fn };
}
