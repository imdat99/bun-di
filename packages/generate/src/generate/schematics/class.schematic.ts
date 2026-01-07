import { toPascalCase } from '../utils/name.utils';

export function generateClass(name: string) {
    const pascalName = toPascalCase(name);
    return `export class ${pascalName} {}
`;
}
