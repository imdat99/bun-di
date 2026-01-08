import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/decorators.ts', 'src/core.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: false,
    clean: true,
    treeshake: true,
    external: ['hono', 'reflect-metadata', 'rxjs'],
});
