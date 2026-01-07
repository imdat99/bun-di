import { toPascalCase } from '../utils/name.utils';

export function generateFilter(name: string) {
    return `import { ArgumentsHost, Catch, ExceptionFilter } from 'hono-di';

@Catch()
export class ${toPascalCase(name)}Filter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {}
}
`;
}
