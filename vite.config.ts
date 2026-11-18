import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { localReportingPlugin } from './server/local-plugin.ts'

export default defineConfig(({ mode }) => ({
  define: mode === 'pages' ? { 'import.meta.env.VITE_REPORTS_ORIGIN': JSON.stringify('https://ocus-latihan.vinoushawk2.chatgpt.site') } : {},
  plugins: [react(), ...(mode === 'test' ? [] : [localReportingPlugin(loadEnv(mode, process.cwd(), '').ADMIN_REPORT_TOKEN ?? '')])],
  server: {
    // Bahan asli dan laporan internal tidak boleh dilayani oleh dev server.
    fs: { deny: ['**/server/**', '**/functions/**', '**/migrations/**', '**/modul/**', '**/content/private/**', '**/reports/**', '**/output/pdf/**', '**/tmp/**', '**/.taste-skill/**', '**/test-results/**', '**/.env*', '**/.git/**', '**/.codex/**', '**/.agents/**'] },
    // Folder akademik/profil QA tidak perlu dipantau HMR (file Chrome dapat terkunci di Windows).
    watch: { ignored: ['**/modul/**', '**/content/private/**', '**/reports/**', '**/tmp/**', '**/.taste-skill/**', '**/test-results/**', '**/playwright-report/**'] },
  },
  test: { include: ['tests/unit/**/*.test.ts'] },
}))
