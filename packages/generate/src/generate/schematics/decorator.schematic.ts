import { toCamelCase } from '../utils/name.utils';

export function generateDecorator(name: string) {
    // Camel case for decorator function
    return `import { SetMetadata } from 'hono-di';

export const ${toCamelCase(name)} = (...args: string[]) => SetMetadata('${toCamelCase(name)}', args);
`;
}
