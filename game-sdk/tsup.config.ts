import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      'esm/index': 'src/index.ts',
    },
    format: ['esm'],
    dts: {
      resolve: true,
      entry: 'src/index.ts',
    },
    sourcemap: false,
    clean: true,
    splitting: false,
  },
  {
    entry: {
      'browser/goportal-game-sdk': 'src/browser.ts',
    },
    format: ['iife'],
    globalName: 'GoPortalSDKBundle',
    sourcemap: false,
    clean: false,
    splitting: false,
    minify: false,
  },
])
