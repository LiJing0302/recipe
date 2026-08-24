import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "uview-plus/libs/css/mixin.scss";'
      }
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})
