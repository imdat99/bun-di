import { toPascalCase } from '../utils/name.utils';

export function generateModule(name: string) {
    const pascalName = toPascalCase(name);
    return `import { Module } from '@hono-di/core';

@Module({
  imports: [
    // hono-di:imports
  ],
  controllers: [
    // hono-di:controllers
  ],
  providers: [
    // hono-di:providers
  ],
})
export class ${pascalName}Module {}
`;
}
