import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { z } from 'zod'
import { App } from '../App'
import { moduleSchema } from '../domain/content'

const preview = { basePath: '/preview', label: 'Preview lokal · draf belum dipublikasikan', reportEndpoint: '/api/dev-preview/complaints', storageNamespace: 'draft-preview' }
const schema = z.strictObject({ schemaVersion: z.literal(1), modules: z.array(moduleSchema).length(1) }).refine(data => data.modules.every(m => m.packages.every(p => p.approval.status === 'pending')))

export async function mountDraftPreview() {
  const root = createRoot(document.getElementById('root')!)
  document.title = 'Preview lokal | OCUS.'
  root.render(<main className="container narrow document-page"><h1>Preview lokal</h1><p role="status">Memuat draf latihan…</p></main>)
  try {
    const response = await fetch('/api/dev-preview/catalog', { cache: 'no-store', credentials: 'same-origin' })
    if (!response.ok) throw Error('Draf tidak tersedia.')
    const catalog = schema.parse(await response.json())
    root.render(<StrictMode><App catalog={catalog} preview={preview}/></StrictMode>)
  } catch {
    root.render(<main className="container narrow document-page"><h1>Preview belum tersedia</h1><p role="alert">Draf belum dapat dimuat. Pastikan server development berjalan dan validasi konten sudah selesai.</p><button type="button" className="button secondary" onClick={() => location.reload()}>Coba lagi</button></main>)
  }
}
