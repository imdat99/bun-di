import { toPascalCase } from '../utils/name.utils';

export function generateService(name: string) {
    const pascalName = toPascalCase(name);
    return `import { Injectable } from '@hono-di/core';

@Injectable()
export class ${pascalName}Service {
  constructor() {}
}
`;
}
