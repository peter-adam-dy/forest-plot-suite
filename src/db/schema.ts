import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { Session } from '@/types'

const DB_NAME = 'forest-plot-app'
const DB_VERSION = 1
const SESSIONS_STORE = 'sessions'

interface ForestPlotDB extends DBSchema {
  sessions: {
    key: string
    value: Session
  }
}

let dbInstance: IDBPDatabase<ForestPlotDB> | null = null

export async function initDB(): Promise<IDBPDatabase<ForestPlotDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<ForestPlotDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' })
      }
    },
  })

  return dbInstance
}

export async function getDB(): Promise<IDBPDatabase<ForestPlotDB>> {
  if (!dbInstance) {
    return await initDB()
  }
  return dbInstance
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDB()
  return await db.getAll(SESSIONS_STORE)
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDB()
  return await db.get(SESSIONS_STORE, id)
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDB()
  await db.put(SESSIONS_STORE, session)
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(SESSIONS_STORE, id)
}

export async function clearAllSessions(): Promise<void> {
  const db = await getDB()
  await db.clear(SESSIONS_STORE)
}

export { SESSIONS_STORE }
