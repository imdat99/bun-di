import { toPascalCase } from '../utils/name.utils';

export function generatePipe(name: string) {
    return `import { PipeTransform, Injectable, ArgumentMetadata } from 'hono-di';

@Injectable()
export class ${toPascalCase(name)}Pipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    return value;
  }
}
`;
}
