import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    process.env = {...process.env, ...loadEnv(mode, process.cwd())};

    return {
        plugins: [react()],
        resolve: {
            alias: [
                { find: '@assets', replacement: path.resolve(__dirname, 'src/assets') },
                { find: '@components', replacement: path.resolve(__dirname, 'src/components') },
                { find: '@constants', replacement: path.resolve(__dirname, 'src/constants') },
                { find: '@hooks', replacement: path.resolve(__dirname, 'src/hooks') },
                { find: '@locales', replacement: path.resolve(__dirname, 'src/locales') },
                { find: '@pages', replacement: path.resolve(__dirname, 'src/pages') },
                { find: '@router', replacement: path.resolve(__dirname, 'src/router') },
                { find: '@services', replacement: path.resolve(__dirname, 'src/services') },
                { find: '@stores', replacement: path.resolve(__dirname, 'src/stores') },
                { find: '@themes', replacement: path.resolve(__dirname, 'src/themes') },
                { find: '@type', replacement: path.resolve(__dirname, 'src/types') },
                { find: '@utils', replacement: path.resolve(__dirname, 'src/utils') },
                { find: 'App', replacement: path.resolve(__dirname, 'src/App') },
                { find: 'Main', replacement: path.resolve(__dirname, 'src/Main') }
            ],
        },
        server: {
            host: true,
            port: 3000,
            proxy: {
                '/hris-api': {
                    changeOrigin: true,
                    target: process.env.VITE_APP_API_PROXY_URL,
                    secure: false,
                },
            },
        }
    }
})