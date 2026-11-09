import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Public 정적 빌드 시 OS 환경변수의 API 키가 번들에 하드코딩되어 노출되는 것을 방지
  const safeApiKey = mode === 'development' ? env.GEMINI_API_KEY || '' : '';
  return {
    base: './',
    plugins: [tailwindcss()],
    define: {
      'process.env.API_KEY': JSON.stringify(safeApiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(safeApiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
