import path from 'node:path';
import fs from 'node:fs';
import { GenerateInput, GenerateResult, GenerateType } from './types';
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

        // Ensure types is an array and sort 'module' to be first
        const types: GenerateType[] = Array.isArray(type) ? type : [type];
        types.sort((a, b) => {
            if (a === 'module') return -1;
            if (b === 'module') return 1;
            return 0;
        });

        const generatedFiles = new Map<string, string>(); // Path -> Content
        const generatedModules = new Map<string, string>(); // Path -> Content (Subset of generatedFiles)

        for (const currentType of types) {
            const kebabName = toKebabCase(name);
            const pascalName = toPascalCase(name);

            // Determine suffix and extension
            let suffix = '';
            let ext = '.ts';
            switch (currentType) {
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
                continue; // Skip this one but try others? Or fail all? Let's skip.
            }

            // Generate content
            let content = '';
            switch (currentType) {
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

            // Store content for potential usage or writing
            generatedFiles.set(filePath, content);
            if (currentType === 'module') {
                generatedModules.set(filePath, content);
            }

            // Add basic create operation
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
            if (!skipImport && currentType !== 'class' && currentType !== 'interface' && currentType !== 'decorator') {
                // Determine import type
                let importType: 'controller' | 'provider' | 'import' = 'provider';
                if (currentType === 'controller') importType = 'controller';
                if (currentType === 'module') importType = 'import';

                // Symbol to import
                let symbolPrefix = pascalName;
                if (currentType === 'service' || currentType === 'provider') symbolPrefix += 'Service';
                else symbolPrefix += toPascalCase(currentType);
                const className = symbolPrefix;

                // 1. Try to find a module in the currently generated files (In-Memory Patching)
                // If we found one, it means we are generating a module AND other files together.
                // We should patch that new module.
                // Exception: If currentType is 'module', we don't import ourselves into ourselves.
                // But we DO want to import a new module into a PARENT module.

                let patchedInMemory = false;

                if (currentType !== 'module') {
                    // Look for a module in the generated list that is in the SAME directory (or parent?)
                    // Typically if generating [module, service], they are in the same dir.
                    for (const [modPath, modContent] of generatedModules.entries()) {
                        if (path.dirname(modPath) === targetDir) {
                            // Found a sibling module being generated. Patch it!
                            const relativePath = `./${fileName.replace(/\.ts$/, '')}`;

                            const patchedContent = patchModule(modContent, className, relativePath, importType);
                            if (patchedContent) {
                                // Update maps
                                generatedFiles.set(modPath, patchedContent);
                                generatedModules.set(modPath, patchedContent);
                                // Update operation
                                const op = result.operations.find(o => o.path === modPath);
                                if (op) op.content = patchedContent;
                                patchedInMemory = true;
                                break; // Only patch one module (the nearest sibling)
                            }
                        }
                    }
                }

                // 2. If not patched in memory (or if it is a module itself), look for existing module on disk
                if (!patchedInMemory) {
                    // For 'module', we look for parent module.
                    // For others, if we didn't find a sibling new module, we look for nearest existing module.

                    // If existing module IS one of the generated modules, we should use the updated content, not read from disk.
                    // findNearestModule traverses up used disk checks. We need to be careful.

                    // If currentType is module, we start looking from parent dir
                    const searchStartDir = currentType === 'module' ? path.dirname(targetDir) : targetDir;
                    const modulePath = findNearestModule(searchStartDir);

                    if (modulePath) {
                        // Check if this modulePath is one of the files we are currently generating/updating?
                        // If so, get content from memory.
                        let moduleContent = generatedFiles.get(modulePath);
                        let isNew = false;

                        if (!moduleContent) {
                            if (fs.existsSync(modulePath)) {
                                moduleContent = fs.readFileSync(modulePath, 'utf-8');
                            }
                        } else {
                            isNew = true;
                        }

                        if (moduleContent) {
                            const moduleDir = path.dirname(modulePath);
                            let relativePath = path.relative(moduleDir, filePath);
                            relativePath = relativePath.replace(/\.ts$/, '');
                            if (!relativePath.startsWith('.')) {
                                relativePath = `./${relativePath}`;
                            }
                            relativePath = normalizePath(relativePath);

                            const patchedContent = patchModule(moduleContent, className, relativePath, importType);

                            if (patchedContent) {
                                if (isNew) {
                                    // Update the operation for this new file
                                    generatedFiles.set(modulePath, patchedContent);
                                    generatedModules.set(modulePath, patchedContent);
                                    const op = result.operations.find(o => o.path === modulePath);
                                    if (op) op.content = patchedContent;
                                } else {
                                    // It's an existing file, add overwrite operation
                                    // Check if we already have an operation for this file (e.g. multiple imports being added to same parent)
                                    const existingOp = result.operations.find(o => o.path === modulePath);
                                    if (existingOp) {
                                        existingOp.content = patchedContent;
                                        // Update memory copy for subsequent patches in this loop
                                        generatedFiles.set(modulePath, patchedContent);
                                    } else {
                                        result.operations.push({
                                            action: 'overwrite',
                                            path: modulePath,
                                            content: patchedContent
                                        });
                                        generatedFiles.set(modulePath, patchedContent); // Store for potential next iterations
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

    } catch (error: any) {
        result.success = false;
        result.errors?.push(error.message);
    }

    return result;
}
