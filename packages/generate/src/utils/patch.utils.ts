import fs from 'node:fs';
import path from 'node:path';
import { toPascalCase } from './name.utils';
import { normalizePath } from './path.utils';

export function findNearestModule(dir: string, rootDir: string = process.cwd()): string | null {
    let currentDir = dir;
    while (true) {
        if (fs.existsSync(currentDir)) {
            const files = fs.readdirSync(currentDir);
            const moduleFile = files.find((f) => f.endsWith('.module.ts'));
            if (moduleFile) {
                return path.join(currentDir, moduleFile);
            }
        }

        if (currentDir === rootDir || currentDir === path.parse(currentDir).root) {
            break;
        }
        currentDir = path.dirname(currentDir);
    }
    return null;
}

export function patchModule(
    content: string,
    className: string,
    importPath: string,
    type: 'controller' | 'provider' | 'import'
): string | null {
    let newContent = content;

    // 1. Add Import
    const importLine = `import { ${className} } from '${importPath}';`;
    if (!content.includes(importLine)) {
        const lastImportMatches = content.match(/^import .*$/gm);
        if (lastImportMatches && lastImportMatches.length > 0) {
            const lastImport = lastImportMatches[lastImportMatches.length - 1];
            newContent = newContent.replace(lastImport, `${lastImport}\n${importLine}`);
        } else {
            newContent = `${importLine}\n${newContent}`;
        }
    }

    // 2. Add to Metadata
    const markerMap = {
        controller: '// hono-di:controllers',
        provider: '// hono-di:providers',
        import: '// hono-di:imports',
    };
    const marker = markerMap[type];

    if (content.includes(marker)) {
        newContent = newContent.replace(marker, `${className}, ${marker}`);
        return newContent;
    }

    return null; // Return null if no patch happened (no markers)
}
