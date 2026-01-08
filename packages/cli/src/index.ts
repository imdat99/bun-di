#!/usr/bin/env bun
import fs from 'node:fs';
import path from 'node:path';
import { generate, GenerateInput, GenerateType } from '@hono-di/generate';

// Wait, I can't import internals of another package easily unless exported.
// I should export utils from @hono-di/generate if CLI needs them, or copy them.
// Let's assume generate exports what we need or check generate/index.ts.
// In strict mode, CLI shouldn't need internal utils ideally, but for writing files it does.
// Let's rely on `generate` returning content and CLI implementing writeFile or using node fs.

function writeGeneratedFile(filePath: string, content: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
}

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        printUsage();
        process.exit(0);
    }

    if (args.includes('--version') || args.includes('-v')) {
        // Read root package or cli package?
        // Let's read local package.json
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
            console.log(pkg.version);
        } catch {
            console.log('0.0.1');
        }
        process.exit(0);
    }

    // Parse Command
    let command = args[0];
    let typeStr = args[1];
    let name = args[2];
    let optionsStartIndex = 3;

    if (command === 'client') {
        await handleClientCommand(args);
        return;
    }

    if (command !== 'g' && command !== 'generate') {
        console.error('Invalid command. Use "g", "generate", or "client".');
        process.exit(1);
    }

    if (!typeStr || typeStr.startsWith('-')) {
        console.error('Missing type argument.');
        printUsage();
        process.exit(1);
    }

    if (!name || name.startsWith('-')) {
        console.error('Missing name argument.');
        printUsage();
        process.exit(1);
    }

    const aliasMap: Record<string, GenerateType> = {
        mo: 'module',
        co: 'controller',
        pr: 'provider',
        s: 'service',
        service: 'service',
        cl: 'class',
        itf: 'interface',
        pi: 'pipe',
        gu: 'guard',
        f: 'filter',
        itc: 'interceptor',
        d: 'decorator',
    };

    const validTypes = [
        'module', 'controller', 'provider', 'service', 'class', 'interface',
        'pipe', 'guard', 'filter', 'interceptor', 'decorator'
    ];

    let type: GenerateType | undefined;
    if (validTypes.includes(typeStr)) {
        type = typeStr as GenerateType;
    } else if (aliasMap[typeStr]) {
        type = aliasMap[typeStr];
    } else {
        console.error(`Invalid type or alias: ${typeStr}`);
        console.error(`Available: ${validTypes.join(', ')}`);
        process.exit(1);
    }

    const input: GenerateInput = {
        type: type!,
        name: name,
        path: 'src',
        flat: false,
        dryRun: false,
        force: false,
        spec: true,
        skipImport: false,
    };

    for (let i = optionsStartIndex; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--flat') input.flat = true;
        else if (arg === '--dry-run') input.dryRun = true;
        else if (arg === '--force') input.force = true;
        else if (arg === '--no-spec') input.spec = false;
        else if (arg === '--spec') input.spec = true;
        else if (arg === '--skip-import') input.skipImport = true;
        else if (arg.startsWith('--path')) {
            const next = args[i + 1];
            if (next && !next.startsWith('-')) {
                input.path = next;
                i++;
            }
        }
    }

    console.log(`Generating ${input.type} "${input.name}"...`);
    const result = generate(input);

    if (!result.success) {
        if (result.errors) {
            result.errors.forEach(e => console.error(`Error: ${e}`));
        }
        process.exit(1);
    }

    for (const op of result.operations) {
        const relativePath = path.relative(process.cwd(), op.path);
        if (input.dryRun) {
            console.log(`[DryRun] ${op.action.toUpperCase()} ${relativePath}`);
        } else {
            if (op.action === 'create' || op.action === 'overwrite') {
                try {
                    if (op.content) {
                        writeGeneratedFile(op.path, op.content);
                        console.log(`${op.action.toUpperCase()} ${relativePath}`);
                    }
                } catch (e: any) {
                    console.error(`Failed to write ${relativePath}: ${e.message}`);
                    process.exit(1);
                }
            } else if (op.action === 'skip') {
                console.log(`SKIP ${relativePath}`);
            }
        }
    }
}

async function handleClientCommand(args: string[]) {
    const { TypeGenerator } = await import('@hono-di/client');

    const outputIndex = args.indexOf('--output');
    const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : 'client.d.ts';

    const projectIndex = args.indexOf('--project');
    const projectPath = projectIndex !== -1 ? args[projectIndex + 1] : 'tsconfig.json';

    console.log(`Generating client types...`);
    console.log(`Project: ${projectPath}`);
    console.log(`Output: ${outputPath}`);

    try {
        const generator = new TypeGenerator({
            tsConfigFilePath: path.resolve(process.cwd(), projectPath),
        });

        const content = await generator.generate();
        fs.writeFileSync(path.resolve(process.cwd(), outputPath), content);
        console.log(`Successfully generated client types at ${outputPath}`);
    } catch (error: any) {
        console.error('Failed to generate client types:', error.message);
        process.exit(1);
    }
}

function printUsage() {
    console.log(`
Usage: hono-di g <type> <name> [options]

Types:
  module (mo), controller (co), service (s), 
  provider (pr), class (cl), interface (itf), 
  pipe (pi), guard (gu), filter (f), 
  interceptor (itc), decorator (d)

Options:
  --path <dir>      Path to generate (default: src)
  --flat            Flatten directory structure
  --dry-run         Simulate run
  --force           Overwrite existing files
  --no-spec         Skip spec file generation
  --skip-import     Skip module patching
`);
}

main();
