import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// מזהה בנייה ייחודי לכל פריסה — משמש לעדכון אוטומטי בצד הלקוח
const BUILD_ID = Date.now().toString()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      // כותב version.json ל-dist עם מזהה הבנייה, כדי שהאפליקציה תזהה גרסה חדשה
      name: 'emit-version-json',
      closeBundle() {
        writeFileSync(
          resolve(__dirname, 'dist/version.json'),
          JSON.stringify({ build: BUILD_ID })
        )
      },
    },
  ],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  base: '/bakery-pricing/',
})
