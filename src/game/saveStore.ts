import initSqlJs from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import {
  createSaveBackup,
  defaultPreferences,
  emptySessions,
  isGameSession,
  normalizePreferences,
  parseSaveBackupText,
  readSessions,
  SESSION_STORAGE_KEY,
  type GamePreferences,
  type SessionList,
} from './sessions'

const DATABASE_NAME = 'memory-lighthouse-sqlite'
const DATABASE_VERSION = 1
const DATABASE_STORE = 'sqlite'
const DATABASE_RECORD = 'game-data'

type SqlDatabase = Awaited<ReturnType<typeof initSqlJs>>['Database'] extends new (...args: never[]) => infer Instance ? Instance : never
export type GameSaveStore = {
  loadSessions: () => SessionList
  saveSessions: (sessions: SessionList) => Promise<void>
  loadPreferences: () => GamePreferences
  savePreferences: (preferences: GamePreferences) => Promise<void>
  exportJson: () => string
  importJson: (content: string) => Promise<{ sessions: SessionList; preferences: GamePreferences }>
  close: () => Promise<void>
}

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
  request.onupgradeneeded = () => request.result.createObjectStore(DATABASE_STORE)
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

const readDatabaseBytes = (database: IDBDatabase): Promise<Uint8Array | null> => new Promise((resolve, reject) => {
  const request = database.transaction(DATABASE_STORE, 'readonly').objectStore(DATABASE_STORE).get(DATABASE_RECORD)
  request.onsuccess = () => {
    const result = request.result
    resolve(result instanceof ArrayBuffer ? new Uint8Array(result) : result instanceof Uint8Array ? result : null)
  }
  request.onerror = () => reject(request.error)
})

const writeDatabaseBytes = (database: IDBDatabase, bytes: Uint8Array): Promise<void> => new Promise((resolve, reject) => {
  const request = database.transaction(DATABASE_STORE, 'readwrite').objectStore(DATABASE_STORE).put(bytes, DATABASE_RECORD)
  request.onsuccess = () => resolve()
  request.onerror = () => reject(request.error)
})

const readSessionRows = (database: SqlDatabase): SessionList => {
  const result = database.exec('SELECT slot, payload FROM sessions ORDER BY slot')
  const sessions = emptySessions()
  for (const row of result[0]?.values ?? []) {
    const slot = Number(row[0])
    if (slot < 1 || slot > sessions.length || typeof row[1] !== 'string') continue
    try {
      const session: unknown = JSON.parse(row[1])
      if (isGameSession(session, slot)) sessions[slot - 1] = session
    } catch {
      continue
    }
  }
  return sessions
}

const readPreferencesFromDatabase = (database: SqlDatabase): GamePreferences => {
  const result = database.exec("SELECT value FROM preferences WHERE name = 'settings'")
  const raw = result[0]?.values[0]?.[0]
  if (typeof raw !== 'string') return defaultPreferences()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && ['pl', 'en', 'es'].includes((parsed as GamePreferences).language)) return normalizePreferences(parsed as Partial<GamePreferences>)
  } catch {
    return defaultPreferences()
  }
  return defaultPreferences()
}

export const createGameSaveStore = async (): Promise<GameSaveStore> => {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is unavailable')
  const idb = await openDatabase()
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
  const bytes = await readDatabaseBytes(idb)
  const database = new SQL.Database(bytes ?? undefined) as SqlDatabase
  const rollback = () => {
    try {
      database.run('ROLLBACK')
    } catch {
      return
    }
  }
  database.run('CREATE TABLE IF NOT EXISTS sessions (slot INTEGER PRIMARY KEY, payload TEXT NOT NULL)')
  database.run('CREATE TABLE IF NOT EXISTS preferences (name TEXT PRIMARY KEY, value TEXT NOT NULL)')
  let writeQueue = Promise.resolve()
  const persist = () => {
    const exported = database.export()
    writeQueue = writeQueue.catch(() => undefined).then(() => writeDatabaseBytes(idb, exported))
    return writeQueue
  }

  if (database.exec('SELECT slot FROM sessions LIMIT 1').length === 0) {
    try {
      const legacy = readSessions(window.localStorage)
      if (legacy.some(Boolean)) {
        database.run('BEGIN TRANSACTION')
        legacy.forEach((session) => {
          if (session) database.run('INSERT OR REPLACE INTO sessions (slot, payload) VALUES (?, ?)', [session.slot, JSON.stringify(session)])
        })
        database.run('COMMIT')
        await persist()
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    } catch {
      rollback()
    }
  }

  const saveSessions = async (sessions: SessionList) => {
    database.run('BEGIN TRANSACTION')
    try {
      database.run('DELETE FROM sessions')
      sessions.forEach((session) => {
        if (session) database.run('INSERT INTO sessions (slot, payload) VALUES (?, ?)', [session.slot, JSON.stringify(session)])
      })
      database.run('COMMIT')
      await persist()
    } catch (error) {
      rollback()
      throw error
    }
  }

  const savePreferences = async (preferences: GamePreferences) => {
    database.run('INSERT OR REPLACE INTO preferences (name, value) VALUES (?, ?)', ['settings', JSON.stringify(preferences)])
    await persist()
  }

  const exportJson = () => JSON.stringify(createSaveBackup(readSessionRows(database), readPreferencesFromDatabase(database)), null, 2)

  const importJson = async (content: string) => {
    const backup = parseSaveBackupText(content)
    if (!backup) throw new Error('Invalid save backup')
    await saveSessions(backup.sessions)
    await savePreferences(backup.preferences)
    return { sessions: backup.sessions, preferences: backup.preferences }
  }

  if (!bytes) await persist()

  return {
    loadSessions: () => readSessionRows(database),
    saveSessions,
    loadPreferences: () => readPreferencesFromDatabase(database),
    savePreferences,
    exportJson,
    importJson,
    close: async () => {
      await writeQueue.catch(() => undefined)
      database.close()
      idb.close()
    },
  }
}
