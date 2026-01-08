
import { generate } from './src/engine';
import fs from 'node:fs';
import path from 'node:path';
import { GenerateInput } from './src/types';

const TEST_DIR = path.join(process.cwd(), 'repro_test_env');

// Clean up
if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DIR);

// Create app.module.ts
const appModuleContent = `
import { Module } from '@hono-di/core';

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
export class AppModule {}
`;
fs.writeFileSync(path.join(TEST_DIR, 'app.module.ts'), appModuleContent);

console.log('Created app.module.ts');

const input: GenerateInput = {
    type: ['module', 'controller', 'service'],
    name: 'feature',
    path: 'repro_test_env',
    flat: false,
    spec: false,
    skipImport: false
};

console.log('Generating feature module...');
const result = generate(input);

if (!result.success) {
    console.error('Generation failed:', result.errors);
    process.exit(1);
}

// Execute operations
for (const op of result.operations) {
    if (op.action === 'create' || op.action === 'overwrite') {
        const filePath = op.path;
        if (op.content) {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, op.content);
            console.log(`Wrote ${filePath}`);
        }
    }
}

const updatedAppModule = fs.readFileSync(path.join(TEST_DIR, 'app.module.ts'), 'utf-8');
console.log('Updated app.module.ts content:');
console.log(updatedAppModule);

if (updatedAppModule.includes('FeatureModule') && updatedAppModule.includes('import { FeatureModule }')) {
    console.log('SUCCESS: FeatureModule was auto-imported into AppModule!');
} else {
    console.log('FAILURE: FeatureModule was NOT auto-imported into AppModule.');
}

const featureModulePath = path.join(TEST_DIR, 'feature', 'feature.module.ts');
if (fs.existsSync(featureModulePath)) {
    const featureModuleContent = fs.readFileSync(featureModulePath, 'utf-8');
    console.log('Feature Module Content:');
    console.log(featureModuleContent);

    const hasService = featureModuleContent.includes('FeatureService') && featureModuleContent.includes('import { FeatureService }');
    const hasController = featureModuleContent.includes('FeatureController') && featureModuleContent.includes('import { FeatureController }');

    if (hasService && hasController) {
        console.log('SUCCESS: Service and Controller were auto-imported into FeatureModule!');
    } else {
        console.log('FAILURE: Service and Controller were NOT auto-imported into FeatureModule.');
        if (!hasService) console.log('Missing: FeatureService');
        if (!hasController) console.log('Missing: FeatureController');
    }
} else {
    console.log('FAILURE: FeatureModule file was not created.');
}

// Cleanup
fs.rmSync(TEST_DIR, { recursive: true, force: true });
