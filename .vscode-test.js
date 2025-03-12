// .vscode-test.js

// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({ files: 'out/test/**/*.test.js' });
