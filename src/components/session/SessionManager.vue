<template>
  <div class="session-manager">
    <v-toolbar density="compact" color="transparent">
      <v-toolbar-title class="text-subtitle-1">Sessions</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon size="small" @click="createNewSession">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn icon size="small" v-bind="props">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="exportAll">
            <v-list-item-title>
              <v-icon start size="small">mdi-export</v-icon>
              Export All Sessions
            </v-list-item-title>
          </v-list-item>
          <v-list-item @click="importDialog = true">
            <v-list-item-title>
              <v-icon start size="small">mdi-import</v-icon>
              Import Session
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-toolbar>

    <v-divider></v-divider>

    <v-text-field
      v-model="searchQuery"
      placeholder="Search sessions..."
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="ma-2 flex-grow-0"
    ></v-text-field>

    <v-list density="compact" class="session-list">
      <v-list-item
        v-for="session in filteredSessions"
        :key="session.id"
        :active="session.id === activeSessionId"
        @click="selectSession(session.id)"
        class="session-item"
      >
        <template v-slot:prepend>
          <v-icon>mdi-chart-box-outline</v-icon>
        </template>

        <v-list-item-title>{{ session.name }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ formatDate(session.modified) }}
        </v-list-item-subtitle>

        <template v-slot:append>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                icon
                size="x-small"
                variant="text"
                v-bind="props"
                @click.stop
              >
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="renameSessionDialog(session)">
                <v-list-item-title>
                  <v-icon start size="small">mdi-pencil</v-icon>
                  Rename
                </v-list-item-title>
              </v-list-item>
              <v-list-item @click="exportSession(session)">
                <v-list-item-title>
                  <v-icon start size="small">mdi-export</v-icon>
                  Export
                </v-list-item-title>
              </v-list-item>
              <v-list-item @click="confirmDelete(session)">
                <v-list-item-title class="text-error">
                  <v-icon start size="small">mdi-delete</v-icon>
                  Delete
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-list-item>

      <v-list-item v-if="filteredSessions.length === 0" class="text-center">
        <v-list-item-title class="text-grey">
          No sessions found
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <!-- Rename Dialog -->
    <v-dialog v-model="renameDialog" max-width="400">
      <v-card>
        <v-card-title>Rename Session</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newSessionName"
            label="Session Name"
            variant="outlined"
            autofocus
            @keyup.enter="saveRename"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="renameDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveRename">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Delete Session</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ sessionToDelete?.name }}"? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="deleteSessionConfirmed">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Import Dialog -->
    <v-dialog v-model="importDialog" max-width="500">
      <v-card>
        <v-card-title>Import Session</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="importFile"
            label="Select JSON file"
            accept="application/json"
            variant="outlined"
            prepend-icon="mdi-file-import"
          ></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="importDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="importSessionFile" :disabled="!importFile">Import</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import type { Session } from '@/types'

const sessionStore = useSessionStore()

const searchQuery = ref('')
const renameDialog = ref(false)
const deleteDialog = ref(false)
const importDialog = ref(false)
const newSessionName = ref('')
const sessionToRename = ref<Session | null>(null)
const sessionToDelete = ref<Session | null>(null)
const importFile = ref<File[] | null>(null)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const activeSessionId = computed(() => sessionStore.activeSessionId)

const filteredSessions = computed(() => {
  if (!searchQuery.value) {
    return sessionStore.sessions
  }
  const query = searchQuery.value.toLowerCase()
  return sessionStore.sessions.filter((session) =>
    session.name.toLowerCase().includes(query)
  )
})

function formatDate(date: Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ago`
  } else if (hours > 0) {
    return `${hours}h ago`
  } else if (minutes > 0) {
    return `${minutes}m ago`
  } else {
    return 'Just now'
  }
}

async function createNewSession() {
  try {
    await sessionStore.createSession(`Session ${sessionStore.sessions.length + 1}`)
    showSnackbar('Session created successfully', 'success')
  } catch (error) {
    console.error('Failed to create session:', error)
    showSnackbar('Failed to create session', 'error')
  }
}

async function selectSession(id: string) {
  try {
    await sessionStore.setActiveSession(id)
  } catch (error) {
    console.error('Failed to select session:', error)
    showSnackbar('Failed to select session', 'error')
  }
}

function renameSessionDialog(session: Session) {
  sessionToRename.value = session
  newSessionName.value = session.name
  renameDialog.value = true
}

async function saveRename() {
  if (!sessionToRename.value || !newSessionName.value.trim()) {
    return
  }

  try {
    await sessionStore.renameSession(sessionToRename.value.id, newSessionName.value.trim())
    renameDialog.value = false
    showSnackbar('Session renamed successfully', 'success')
  } catch (error) {
    console.error('Failed to rename session:', error)
    showSnackbar('Failed to rename session', 'error')
  }
}

function confirmDelete(session: Session) {
  sessionToDelete.value = session
  deleteDialog.value = true
}

async function deleteSessionConfirmed() {
  if (!sessionToDelete.value) {
    return
  }

  try {
    await sessionStore.deleteSession(sessionToDelete.value.id)
    deleteDialog.value = false
    showSnackbar('Session deleted successfully', 'success')
  } catch (error) {
    console.error('Failed to delete session:', error)
    showSnackbar('Failed to delete session', 'error')
  }
}

async function exportSession(session: Session) {
  try {
    const jsonData = await sessionStore.exportSession(session.id)
    downloadJson(jsonData, `${session.name}.json`)
    showSnackbar('Session exported successfully', 'success')
  } catch (error) {
    console.error('Failed to export session:', error)
    showSnackbar('Failed to export session', 'error')
  }
}

async function exportAll() {
  try {
    const jsonData = await sessionStore.exportAllSessions()
    downloadJson(jsonData, 'all-sessions.json')
    showSnackbar('All sessions exported successfully', 'success')
  } catch (error) {
    console.error('Failed to export sessions:', error)
    showSnackbar('Failed to export sessions', 'error')
  }
}

async function importSessionFile() {
  if (!importFile.value || importFile.value.length === 0) {
    return
  }

  try {
    const file = importFile.value[0]
    if (!file) {
      throw new Error('No file selected')
    }
    const text = await file.text()
    await sessionStore.importSession(text)
    importDialog.value = false
    importFile.value = null
    showSnackbar('Session imported successfully', 'success')
  } catch (error) {
    console.error('Failed to import session:', error)
    showSnackbar('Failed to import session', 'error')
  }
}

function downloadJson(jsonData: string, filename: string) {
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function showSnackbar(message: string, color: string = 'success') {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.session-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.session-item {
  cursor: pointer;
}
</style>
