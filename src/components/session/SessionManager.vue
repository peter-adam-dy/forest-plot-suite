<template>
  <div class="session-grid">
    <!-- Search Bar and Actions -->
    <div class="search-actions mb-6">
      <div class="d-flex align-center">
        <v-text-field
          v-model="searchQuery"
          placeholder="Search sessions..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          style="max-width: 20rem;"
        ></v-text-field>

        <v-spacer></v-spacer>

        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="createNewSession"
          style="margin-right: 8px;"
        >
          New Session
        </v-btn>

        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              icon="mdi-dots-vertical"
              variant="text"
              v-bind="props"
            ></v-btn>
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
                Import Sessions
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <!-- Session List -->
    <v-list border class="session-list">
      <template v-for="(session, index) in filteredSessions" :key="session.id">
        <v-list-item
          @click="handleSessionClick(session.id)"
          class="session-list-item"
        >
          <template v-slot:prepend>
            <v-icon>mdi-chart-box-outline</v-icon>
          </template>

          <v-list-item-title>{{ session.name }}</v-list-item-title>
          <v-list-item-subtitle>
            Modified {{ formatDate(session.modified) }} • {{ session.dataVersions[0]?.data.length || 0 }} data points
          </v-list-item-subtitle>

          <template v-slot:append>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon size="small" variant="text" v-bind="props" @click.stop>
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

        <v-divider v-if="index < filteredSessions.length - 1"></v-divider>
      </template>
    </v-list>

    <!-- Empty State -->
    <div v-if="filteredSessions.length === 0 && searchQuery" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1">mdi-magnify</v-icon>
      <p class="text-body-1 text-grey mt-4">No sessions found</p>
    </div>

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

    <!-- New Session Dialog -->
    <v-dialog v-model="newSessionDialog" max-width="400">
      <v-card>
        <v-card-title>Create New Session</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newSessionNameInput"
            label="Session Name"
            variant="outlined"
            autofocus
            @keyup.enter="confirmCreateSession"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="newSessionDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmCreateSession" :disabled="!newSessionNameInput.trim()">Create</v-btn>
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

const emit = defineEmits<{
  sessionSelected: [sessionId: string]
}>()

const searchQuery = ref('')
const renameDialog = ref(false)
const deleteDialog = ref(false)
const importDialog = ref(false)
const newSessionDialog = ref(false)
const newSessionName = ref('')
const newSessionNameInput = ref('')
const sessionToRename = ref<Session | null>(null)
const sessionToDelete = ref<Session | null>(null)
const importFile = ref<File[] | null>(null)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

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

function createNewSession() {
  newSessionNameInput.value = `Session ${sessionStore.sessions.length + 1}`
  newSessionDialog.value = true
}

async function confirmCreateSession() {
  if (!newSessionNameInput.value.trim()) {
    return
  }

  try {
    const session = await sessionStore.createSession(newSessionNameInput.value.trim())
    newSessionDialog.value = false
    newSessionNameInput.value = ''
    showSnackbar('Session created successfully', 'success')
    // Emit event to navigate to new session
    emit('sessionSelected', session.id)
  } catch (error) {
    console.error('Failed to create session:', error)
    showSnackbar('Failed to create session', 'error')
  }
}

function handleSessionClick(sessionId: string) {
  emit('sessionSelected', sessionId)
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
.session-grid {
  max-width: 1400px;
  margin: 0 auto;
}

.search-actions {
  width: 100%;
  margin-bottom: 24px;
}

.session-list-item {
  cursor: pointer;
  transition: background-color 0.2s;
  padding-top: 16px !important;
  padding-bottom: 16px !important;
}

.session-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style>
