import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: '@assets', replacement: path.resolve(__dirname, 'src/assets') },
            { find: '@components', replacement: path.resolve(__dirname, 'src/components') },
            { find: '@constants', replacement: path.resolve(__dirname, 'src/constants') },
            { find: '@contexts', replacement: path.resolve(__dirname, 'src/contexts') },
            { find: '@hooks', replacement: path.resolve(__dirname, 'src/hooks') },
            { find: '@locales', replacement: path.resolve(__dirname, 'src/locales') },
            { find: '@pages', replacement: path.resolve(__dirname, 'src/pages') },
            { find: '@routes', replacement: path.resolve(__dirname, 'src/routes') },
            { find: '@services', replacement: path.resolve(__dirname, 'src/services') },
            { find: '@stores', replacement: path.resolve(__dirname, 'src/stores') },
            { find: '@themes', replacement: path.resolve(__dirname, 'src/themes') },
            { find: '@type', replacement: path.resolve(__dirname, 'src/types') },
            { find: '@utils', replacement: path.resolve(__dirname, 'src/utils') },
            { find: 'App', replacement: path.resolve(__dirname, 'src/App') },
            { find: 'Main', replacement: path.resolve(__dirname, 'src/Main') }
        ]
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}']
    }
});
