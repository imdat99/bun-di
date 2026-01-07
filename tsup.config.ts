import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/decorators.ts', 'src/core.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false, // User can minify in their own build process
  external: ['hono', 'reflect-metadata', 'rxjs'],
  tsconfig: 'tsconfig.build.json',
});
