import path from 'node:path';
import fs from 'node:fs';
import { GenerateInput, GenerateResult } from './types';
import { toKebabCase, toPascalCase } from './utils/name.utils';
import { ensureDirectoryExists, fileExists } from './utils/fs.utils';
import { generateModule } from './schematics/module.schematic';
import { generateService } from './schematics/service.schematic';
import { generateController } from './schematics/controller.schematic';
import { generateClass } from './schematics/class.schematic';
import { generateInterface } from './schematics/interface.schematic';
import { generatePipe } from './schematics/pipe.schematic';
import { generateGuard } from './schematics/guard.schematic';
import { generateFilter } from './schematics/filter.schematic';
import { generateInterceptor } from './schematics/interceptor.schematic';
import { generateDecorator } from './schematics/decorator.schematic';
import { findNearestModule, patchModule } from './utils/patch.utils';
import { normalizePath } from './utils/path.utils';

export function generate(input: GenerateInput): GenerateResult {
    const result: GenerateResult = {
        success: true,
        operations: [],
        errors: [],
        warnings: [],
    };

    try {
        const { type, name, path: inputPath = 'src', flat, force, dryRun, skipImport } = input;
        const kebabName = toKebabCase(name);
        const pascalName = toPascalCase(name);

        // Determine suffix and extension
        let suffix = '';
        let ext = '.ts';
        switch (type) {
            case 'module': suffix = '.module'; break;
            case 'controller': suffix = '.controller'; break;
            case 'service':
            case 'provider': suffix = '.service'; break; // Provider alias maps to service typically
            case 'class': suffix = ''; break;
            case 'interface': suffix = '.interface'; break;
            case 'pipe': suffix = '.pipe'; break;
            case 'guard': suffix = '.guard'; break;
            case 'filter': suffix = '.filter'; break;
            case 'interceptor': suffix = '.interceptor'; break;
            case 'decorator': suffix = '.decorator'; break;
        }

        // Determine target directory and file name
        const fileName = `${kebabName}${suffix}${ext}`;
        let targetDir = path.join(process.cwd(), inputPath);

        if (!flat) {
            targetDir = path.join(targetDir, kebabName);
        }

        const filePath = path.join(targetDir, fileName);

        // Check existence
        if (fileExists(filePath) && !force) {
            result.success = false;
            result.errors?.push(`File ${filePath} already exists.`);
            result.operations.push({ action: 'error', path: filePath });
            return result;
        }

        // Generate content
        let content = '';
        switch (type) {
            case 'module': content = generateModule(name); break;
            case 'controller': content = generateController(name); break;
            case 'service':
            case 'provider': content = generateService(name); break;
            case 'class': content = generateClass(name); break;
            case 'interface': content = generateInterface(name); break;
            case 'pipe': content = generatePipe(name); break;
            case 'guard': content = generateGuard(name); break;
            case 'filter': content = generateFilter(name); break;
            case 'interceptor': content = generateInterceptor(name); break;
            case 'decorator': content = generateDecorator(name); break;
        }

        // Add operation
        result.operations.push({
            action: fileExists(filePath) ? 'overwrite' : 'create',
            path: filePath,
            content: content
        });

        if (input.spec !== false) { // Default true
            const specName = `${kebabName}${suffix}.spec${ext}`;
            const specPath = path.join(targetDir, specName);
            if (!fileExists(specPath) || force) {
                result.operations.push({
                    action: fileExists(specPath) ? 'overwrite' : 'create',
                    path: specPath,
                    content: `// Tests for ${name}`
                });
            }
        }

        // Auto-import logic
        if (!skipImport && type !== 'module' && type !== 'class' && type !== 'interface' && type !== 'decorator') {
            const modulePath = findNearestModule(targetDir);
            if (modulePath) {
                // Calculate relative path for import
                const moduleDir = path.dirname(modulePath);
                let relativePath = path.relative(moduleDir, filePath);
                // Remove extension for import
                relativePath = relativePath.replace(/\.ts$/, '');
                if (!relativePath.startsWith('.')) {
                    relativePath = `./${relativePath}`;
                }
                relativePath = normalizePath(relativePath);

                let importType: 'controller' | 'provider' | 'import' = 'provider';
                if (type === 'controller') importType = 'controller';

                // TODO: Handle module imports into other modules if newly generated is a module

                const patchedContent = patchModule(modulePath, `${pascalName}${toPascalCase(type === 'provider' ? 'Service' : type)}`, relativePath, importType);

                if (patchedContent) {
                    result.operations.push({
                        action: 'overwrite',
                        path: modulePath,
                        content: patchedContent
                    });
                }
            }
        }

    } catch (error: any) {
        result.success = false;
        result.errors?.push(error.message);
    }

    return result;
}
