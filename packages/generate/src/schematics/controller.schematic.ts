import { toPascalCase } from '../utils/name.utils';

export function generateController(name: string) {
    const pascalName = toPascalCase(name);
    return `import { Controller, Get } from '@hono-di/core';

@Controller('${name.toLowerCase()}')
export class ${pascalName}Controller {
  constructor() {}

  @Get('/')
  index() {
    return 'Hello ${pascalName}';
  }
}
`;
}
