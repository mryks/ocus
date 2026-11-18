import { sessionSchema, type Session } from './session'

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export const sessionKey = (moduleId: string, packageId: string, namespace?: string) => `${namespace ? `cbt:${namespace}:v1` : 'cbt:v1'}:${moduleId}:${packageId}`
export type Loaded = { kind: 'empty' } | { kind: 'ok'; session: Session } | { kind: 'invalid' } | { kind: 'unavailable' }
export function readSession(storage: StorageLike, key: string): Loaded {
  let raw: string | null
  try { raw = storage.getItem(key) } catch { return { kind: 'unavailable' } }
  if (raw === null) return { kind: 'empty' }
  try { const result = sessionSchema.safeParse(JSON.parse(raw)); return result.success ? { kind: 'ok', session: result.data } : { kind: 'invalid' } } catch { return { kind: 'invalid' } }
}
export function writeSession(storage: StorageLike, key: string, session: Session): boolean {
  try { storage.setItem(key, JSON.stringify(session)); return true } catch { return false }
}
export function browserStorage(): StorageLike {
  // Akses localStorage sendiri dapat melempar SecurityError pada mode browser tertentu.
  return { getItem: (key) => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value), removeItem: (key) => window.localStorage.removeItem(key) }
}
