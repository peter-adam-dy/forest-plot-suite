<template>
  <div class="data-editor">
    <v-card>
      <v-card-title class="d-flex align-center">
        <span>Data Editor</span>
        <v-spacer></v-spacer>

        <!-- Save Status Indicator -->
        <v-chip
          v-if="saveStatus !== 'idle'"
          :color="saveStatusColor"
          size="small"
          class="mr-2"
        >
          <v-icon start size="small">{{ saveStatusIcon }}</v-icon>
          {{ saveStatusText }}
        </v-chip>

        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="addRow"
          size="small"
          class="mr-2"
        >
          Add Row
        </v-btn>
        <v-btn
          color="success"
          prepend-icon="mdi-file-import"
          @click="triggerFileImport"
          size="small"
        >
          Import
        </v-btn>

        <!-- Hidden file input for unified import -->
        <input
          ref="fileInput"
          type="file"
          accept=".csv,.xlsx,.xls,.tsv"
          @change="handleFileSelect"
          style="display: none"
        />
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="localData"
          :items-per-page="-1"
          class="elevation-1"
        >
          <template v-slot:item.study="{ item }">
            <v-text-field
              v-model="item.study"
              density="compact"
              variant="outlined"
              hide-details
              @update:model-value="handleDataChange"
            ></v-text-field>
          </template>

          <template v-slot:item.value="{ item }">
            <v-text-field
              v-model.number="item.value"
              type="number"
              step="0.01"
              density="compact"
              variant="outlined"
              hide-details
              @update:model-value="handleDataChange"
            ></v-text-field>
          </template>

          <template v-slot:item.ci_lower="{ item }">
            <v-text-field
              v-model.number="item.ci_lower"
              type="number"
              step="0.01"
              density="compact"
              variant="outlined"
              hide-details
              @update:model-value="handleDataChange"
            ></v-text-field>
          </template>

          <template v-slot:item.ci_upper="{ item }">
            <v-text-field
              v-model.number="item.ci_upper"
              type="number"
              step="0.01"
              density="compact"
              variant="outlined"
              hide-details
              @update:model-value="handleDataChange"
            ></v-text-field>
          </template>

          <template v-slot:item.weight="{ item }">
            <v-text-field
              v-model.number="item.weight"
              type="number"
              step="0.01"
              density="compact"
              variant="outlined"
              hide-details
              placeholder="Optional"
              @update:model-value="handleDataChange"
            ></v-text-field>
          </template>

          <template v-slot:item.actions="{ index }">
            <v-btn
              icon
              size="small"
              variant="text"
              color="error"
              @click="deleteRow(index)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>

          <template v-slot:bottom>
            <div class="text-center pa-2">
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                prepend-icon="mdi-plus"
                @click="addRow"
              >
                Add Another Row
              </v-btn>
            </div>
          </template>
        </v-data-table>

        <div v-if="validationErrors.length > 0" class="mt-4">
          <v-alert type="error" variant="tonal">
            <div class="text-subtitle-2 mb-2">Validation Errors:</div>
            <ul>
              <li v-for="(error, idx) in validationErrors" :key="idx">{{ error }}</li>
            </ul>
          </v-alert>
        </div>

        <div v-if="validationWarnings.length > 0" class="mt-4">
          <v-alert type="warning" variant="tonal">
            <div class="text-subtitle-2 mb-2">Warnings:</div>
            <ul>
              <li v-for="(warning, idx) in validationWarnings" :key="idx">{{ warning }}</li>
            </ul>
          </v-alert>
        </div>
      </v-card-text>
    </v-card>

    <!-- CSV Import Dialog -->
    <CSVImporter
      v-model="csvImportDialog"
      @import="handleCSVImport"
    />

    <!-- Excel Import Dialog -->
    <ExcelImporter
      v-model="excelImportDialog"
      @import="handleExcelImport"
    />

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useSessionStore } from '@/stores/session'
import type { ForestPlotData } from '@/types'
import { validateData } from '@/services/dataParser'
import CSVImporter from './CSVImporter.vue'
import ExcelImporter from './ExcelImporter.vue'

const sessionStore = useSessionStore()

const localData = ref<ForestPlotData[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const csvImportDialog = ref(false)
const excelImportDialog = ref(false)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const isInitialLoad = ref(true)

const headers = [
  { title: 'Study', key: 'study', sortable: true, width: '25%' },
  { title: 'Value', key: 'value', sortable: true, width: '15%' },
  { title: 'Lower CI', key: 'ci_lower', sortable: true, width: '15%' },
  { title: 'Upper CI', key: 'ci_upper', sortable: true, width: '15%' },
  { title: 'Weight', key: 'weight', sortable: true, width: '15%' },
  { title: 'Actions', key: 'actions', sortable: false, width: '15%' },
]

const validationResult = computed(() => validateData(localData.value))
const validationErrors = computed(() => validationResult.value.errors)
const validationWarnings = computed(() => validationResult.value.warnings)

// Save status computed properties
const saveStatusColor = computed(() => {
  switch (saveStatus.value) {
    case 'saving': return 'info'
    case 'saved': return 'success'
    case 'error': return 'error'
    default: return 'default'
  }
})

const saveStatusIcon = computed(() => {
  switch (saveStatus.value) {
    case 'saving': return 'mdi-loading mdi-spin'
    case 'saved': return 'mdi-check'
    case 'error': return 'mdi-alert'
    default: return ''
  }
})

const saveStatusText = computed(() => {
  switch (saveStatus.value) {
    case 'saving': return 'Saving...'
    case 'saved': return 'Saved'
    case 'error': return 'Save failed'
    default: return ''
  }
})

// Load data from active session
watch(
  () => sessionStore.activeDataVersion,
  (dataVersion) => {
    isInitialLoad.value = true
    if (dataVersion) {
      localData.value = JSON.parse(JSON.stringify(dataVersion.data))
    } else {
      localData.value = []
    }
    // Reset save status and allow auto-save after initial load
    saveStatus.value = 'idle'
    setTimeout(() => {
      isInitialLoad.value = false
    }, 100)
  },
  { immediate: true }
)

// Auto-save data changes with debouncing
watchDebounced(
  localData,
  async () => {
    // Skip auto-save during initial load or if there are errors
    if (isInitialLoad.value || validationErrors.value.length > 0) {
      return
    }

    // Skip if data is empty
    if (localData.value.length === 0) {
      saveStatus.value = 'idle'
      return
    }

    try {
      saveStatus.value = 'saving'
      await sessionStore.updateData(localData.value)
      saveStatus.value = 'saved'

      // Clear "saved" status after 2 seconds
      setTimeout(() => {
        if (saveStatus.value === 'saved') {
          saveStatus.value = 'idle'
        }
      }, 2000)
    } catch (error) {
      console.error('Auto-save failed:', error)
      saveStatus.value = 'error'

      // Clear error status after 3 seconds
      setTimeout(() => {
        if (saveStatus.value === 'error') {
          saveStatus.value = 'idle'
        }
      }, 3000)
    }
  },
  { debounce: 500, deep: true }
)

function addRow() {
  localData.value.push({
    study: '',
    value: 0,
    ci_lower: 0,
    ci_upper: 0,
    weight: undefined,
  })
}

function deleteRow(index: number) {
  localData.value.splice(index, 1)
  handleDataChange()
}

function handleDataChange() {
  // Trigger validation (auto-save will handle saving)
  validateData(localData.value)
}

// Trigger file import by clicking hidden input
function triggerFileImport() {
  fileInput.value?.click()
}

// Handle file selection and route to appropriate importer
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // Detect file type by extension
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
    // CSV/TSV file - pass file to CSV importer
    csvImportDialog.value = true
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    // Excel file - pass file to Excel importer
    excelImportDialog.value = true
  } else {
    showSnackbar('Unsupported file type. Please use CSV, TSV, or Excel files.', 'error')
  }

  // Store file reference for the importers to access
  if (fileInput.value) {
    // The importers will handle the file directly
  }

  // Reset file input so the same file can be selected again
  target.value = ''
}

function handleCSVImport(data: ForestPlotData[]) {
  localData.value = data
  csvImportDialog.value = false
  showSnackbar(`Imported ${data.length} rows from CSV`, 'success')
}

function handleExcelImport(data: ForestPlotData[]) {
  localData.value = data
  excelImportDialog.value = false
  showSnackbar(`Imported ${data.length} rows from Excel`, 'success')
}

function showSnackbar(message: string, color: string = 'success') {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.data-editor {
  width: 100%;
}

:deep(.v-data-table) {
  font-size: 0.875rem;
}

:deep(.v-data-table td) {
  padding: 4px 8px !important;
}
</style>
