import { DatabaseSync } from 'node:sqlite'
import type { SqlDatabase } from './complaints'

export function sqliteAdapter(database: DatabaseSync): SqlDatabase {
  return { prepare(sql) { return { bind(...values) { return {
    async first<T>() { return (database.prepare(sql).get(...values) as T | undefined) ?? null },
    async all<T>() { return { results: database.prepare(sql).all(...values) as T[] } },
    async run() { const result = database.prepare(sql).run(...values); return { meta: { changes: Number(result.changes) } } },
  } } } } }
}
