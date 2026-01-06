export function isFunction(val: any): boolean {
    return typeof val === 'function';
}

export function isObject(val: any): boolean {
    return typeof val === 'object' && val !== null;
}

export function isString(val: any): boolean {
    return typeof val === 'string';
}

export function isSymbol(val: any): boolean {
    return typeof val === 'symbol';
}

// Placeholder for now
export const forwardRef = (fn: () => any) => fn();
