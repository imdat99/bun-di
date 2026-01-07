import { toPascalCase } from '../utils/name.utils';

export function generateInterface(name: string) {
    const pascalName = toPascalCase(name);
    return `export interface ${pascalName} {}
`;
}
