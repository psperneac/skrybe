import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: 'src/main/index.ts'
      }
    }
  } as any,
  preload: {
    build: {
      lib: {
        entry: 'src/preload/index.ts'
      }
    }
  } as any,
  renderer: {
    resolve: {
      alias: {
        '@': resolve(new URL('.', import.meta.url).pathname, './src')
      }
    },
    plugins: [react(), tailwindcss({
      // Disable Lightning CSS optimization
      optimize: false,
    })]
  },
})