import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'
import { catalogSchema, type Catalog } from './domain/content'
import publicCatalog from './content/catalog.json'

async function main() {
  if (import.meta.env.DEV && /^\/preview(?:\/|$)/.test(window.location.pathname)) {
    await (await import('./dev/preview')).mountDraftPreview()
    return
  }
  let catalog: Catalog = { schemaVersion: 1, modules: [] }
  let contentError = false
  const isDev = import.meta.env.DEV && /^\/dev(?:\/|$)/.test(window.location.pathname)
  try {
    catalog = catalogSchema.parse(isDev ? (await import('./dev/fixture')).fixtureCatalog : publicCatalog)
  } catch { contentError = true }
  createRoot(document.getElementById('root')!).render(<StrictMode><App catalog={catalog} isDev={isDev} contentError={contentError}/></StrictMode>)
}
void main()
