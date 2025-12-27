import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import type { Session, DataVersion, PlotConfig, ForestPlotData } from '@/types'
import { defaultPlotConfig } from '@/types'
import {
  getAllSessions,
  saveSession,
  deleteSession as dbDeleteSession,
  initDB,
} from '@/db/schema'

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([])
  const activeSessionId = ref<string | null>(null)
  const activeDataVersionIndex = ref<number>(0)
  const initialized = ref(false)

  const activeSession = computed(() => {
    if (!activeSessionId.value) return null
    return sessions.value.find((s) => s.id === activeSessionId.value) || null
  })

  const activeDataVersion = computed(() => {
    if (!activeSession.value || !activeSession.value.dataVersions.length) {
      return null
    }
    const index = Math.min(
      activeDataVersionIndex.value,
      activeSession.value.dataVersions.length - 1
    )
    return activeSession.value.dataVersions[index] || null
  })

  async function initialize() {
    if (initialized.value) return

    try {
      await initDB()
      sessions.value = await getAllSessions()

      // Sort by modified date (most recent first)
      sessions.value.sort((a, b) =>
        new Date(b.modified).getTime() - new Date(a.modified).getTime()
      )

      // Set active session to most recent if exists
      if (sessions.value.length > 0 && !activeSessionId.value) {
        activeSessionId.value = sessions.value[0]?.id || null
        activeDataVersionIndex.value = 0
      }

      initialized.value = true
    } catch (error) {
      console.error('Failed to initialize session store:', error)
      throw error
    }
  }

  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  function createDataVersion(
    name: string = 'Version 1',
    data: ForestPlotData[] = []
  ): DataVersion {
    return {
      id: generateId(),
      name,
      timestamp: new Date(),
      data,
    }
  }

  async function createSession(name: string = 'New Session'): Promise<Session> {
    const session: Session = {
      id: generateId(),
      name,
      created: new Date(),
      modified: new Date(),
      dataVersions: [createDataVersion()],
      config: { ...defaultPlotConfig },
      generatedCode: '',
    }

    sessions.value.unshift(session)
    activeSessionId.value = session.id
    activeDataVersionIndex.value = 0

    await saveSession(toRaw(session))
    return session
  }

  async function updateSession(
    id: string,
    updates: Partial<Omit<Session, 'id' | 'created'>>
  ): Promise<void> {
    const session = sessions.value.find((s) => s.id === id)
    if (!session) {
      throw new Error(`Session ${id} not found`)
    }

    Object.assign(session, updates, { modified: new Date() })
    await saveSession(toRaw(session))
  }

  async function renameSession(id: string, name: string): Promise<void> {
    await updateSession(id, { name })
  }

  async function deleteSession(id: string): Promise<void> {
    const index = sessions.value.findIndex((s) => s.id === id)
    if (index === -1) {
      throw new Error(`Session ${id} not found`)
    }

    sessions.value.splice(index, 1)
    await dbDeleteSession(id)

    // If deleted session was active, switch to another
    if (activeSessionId.value === id) {
      activeSessionId.value = sessions.value.length > 0 ? (sessions.value[0]?.id || null) : null
      activeDataVersionIndex.value = 0
    }
  }

  async function setActiveSession(id: string | null): Promise<void> {
    if (id === null) {
      activeSessionId.value = null
      activeDataVersionIndex.value = 0
      return
    }

    const session = sessions.value.find((s) => s.id === id)
    if (!session) {
      throw new Error(`Session ${id} not found`)
    }

    activeSessionId.value = id
    activeDataVersionIndex.value = 0
  }

  async function updateConfig(config: Partial<PlotConfig>): Promise<void> {
    if (!activeSession.value) {
      throw new Error('No active session')
    }

    await updateSession(activeSession.value.id, {
      config: { ...activeSession.value.config, ...config },
    })
  }

  async function updateData(data: ForestPlotData[]): Promise<void> {
    if (!activeSession.value) {
      throw new Error('No active session')
    }

    const currentVersion = activeDataVersion.value
    if (!currentVersion) {
      throw new Error('No active data version')
    }

    currentVersion.data = data
    currentVersion.timestamp = new Date()

    await updateSession(activeSession.value.id, {
      dataVersions: activeSession.value.dataVersions,
    })
  }

  async function createNewDataVersion(
    name: string,
    data?: ForestPlotData[]
  ): Promise<void> {
    if (!activeSession.value) {
      throw new Error('No active session')
    }

    const newVersion = createDataVersion(
      name,
      data || activeDataVersion.value?.data || []
    )

    activeSession.value.dataVersions.push(newVersion)
    activeDataVersionIndex.value = activeSession.value.dataVersions.length - 1

    await updateSession(activeSession.value.id, {
      dataVersions: activeSession.value.dataVersions,
    })
  }

  async function setActiveDataVersion(index: number): Promise<void> {
    if (!activeSession.value) {
      throw new Error('No active session')
    }

    if (index < 0 || index >= activeSession.value.dataVersions.length) {
      throw new Error('Invalid data version index')
    }

    activeDataVersionIndex.value = index
  }

  async function updateGeneratedCode(code: string): Promise<void> {
    if (!activeSession.value) {
      throw new Error('No active session')
    }

    await updateSession(activeSession.value.id, {
      generatedCode: code,
    })
  }

  async function exportSession(id: string): Promise<string> {
    const session = sessions.value.find((s) => s.id === id)
    if (!session) {
      throw new Error(`Session ${id} not found`)
    }

    return JSON.stringify(toRaw(session), null, 2)
  }

  async function importSession(jsonData: string): Promise<Session> {
    const session = JSON.parse(jsonData) as Session

    // Generate new ID to avoid conflicts
    session.id = generateId()
    session.created = new Date()
    session.modified = new Date()

    sessions.value.unshift(session)
    await saveSession(toRaw(session))

    return session
  }

  async function exportAllSessions(): Promise<string> {
    return JSON.stringify(toRaw(sessions.value), null, 2)
  }

  return {
    // State
    sessions,
    activeSessionId,
    activeDataVersionIndex,
    initialized,

    // Computed
    activeSession,
    activeDataVersion,

    // Actions
    initialize,
    createSession,
    updateSession,
    renameSession,
    deleteSession,
    setActiveSession,
    updateConfig,
    updateData,
    createNewDataVersion,
    setActiveDataVersion,
    updateGeneratedCode,
    exportSession,
    importSession,
    exportAllSessions,
  }
})
