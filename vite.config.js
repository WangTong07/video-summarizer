import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 【核心修复】在这里告诉Vite不要替换process.env
  define: {
    'process.env': {}
  }
})