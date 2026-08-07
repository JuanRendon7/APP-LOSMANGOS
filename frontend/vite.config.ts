import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true,
    watch: {
      // Bind mounts de Docker en Windows no siempre propagan eventos
      // inotify; sin polling, el watcher de Vite se queda con contenido
      // desactualizado hasta reiniciar el contenedor.
      usePolling: true,
      interval: 300,
    },
  },
})
