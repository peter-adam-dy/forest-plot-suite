<template>
  <div class="session-grid">
    <!-- Search Bar and Actions -->
    <div class="search-actions mb-6">
      <v-text-field
        v-model="searchQuery"
        placeholder="Search sessions..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
      ></v-text-field>

      <div class="actions-menu mt-3">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-export"
          @click="exportAll"
        >
          Export All
        </v-btn>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-import"
          @click="importDialog = true"
          class="ml-2"
        >
          Import
        </v-btn>
      </div>
    </div>

    <!-- Session Cards Grid -->
    <v-row>
      <v-col
        v-for="session in filteredSessions"
        :key="session.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card
          class="session-card"
          hover
          @click="handleSessionClick(session.id)"
        >
          <v-card-title class="text-h6">{{ session.name }}</v-card-title>
          <v-card-subtitle>
            Modified {{ formatDate(session.modified) }}
          </v-card-subtitle>
          <v-card-text>
            <v-icon size="small" class="mr-1">mdi-chart-line</v-icon>
            {{ session.dataVersions[0]?.data.length || 0 }} data points
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon size="small" v-bind="props" @click.stop>
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
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Create New Session Card -->
      <v-col cols="12" sm="6" md="4" lg="3">
        <v-card
          class="session-card session-card-new"
          hover
          @click="createNewSession"
        >
          <div class="d-flex flex-column align-center justify-center" style="height: 100%">
            <v-icon size="48" color="primary">mdi-plus</v-icon>
            <p class="text-h6 mt-2">Create New Session</p>
          </div>
        </v-card>
      </v-col>
    </v-row>

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
const newSessionName = ref('')
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

async function createNewSession() {
  try {
    const session = await sessionStore.createSession(`Session ${sessionStore.sessions.length + 1}`)
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
  padding: 24px;
}

.search-actions {
  max-width: 600px;
}

.actions-menu {
  display: flex;
  gap: 8px;
}

.session-card {
  height: 180px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.session-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

.session-card-new {
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  background: rgba(var(--v-theme-primary), 0.02);
}

.session-card-new:hover {
  background: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.5);
}
</style>
