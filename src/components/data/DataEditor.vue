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
        <div class="data-table-wrapper elevation-1">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px;"></th>
                <th style="min-width: 200px;">Outcome</th>
                <th style="width: 120px;">Value</th>
                <th style="width: 120px;">Lower CI</th>
                <th style="width: 120px;">Upper CI</th>
                <th style="width: 120px;">Weight</th>
                <th style="width: 80px;">Actions</th>
              </tr>
            </thead>
            <draggable
              v-model="draggableData"
              tag="tbody"
              :item-key="(_: unknown, index: number) => index"
              handle=".drag-handle"
              @change="handleDragChange"
            >
              <template #item="{ element, index }">
                <tr>
                  <td class="text-center">
                    <v-icon class="drag-handle">mdi-drag-vertical</v-icon>
                  </td>
                  <td>
                    <div class="d-flex align-center gap-2">
                      <v-textarea
                        :ref="(el) => setTextareaRef(el, index)"
                        v-model="element.outcome"
                        density="compact"
                        variant="outlined"
                        hide-details
                        rows="1"
                        auto-grow
                        @update:model-value="handleDataChange"
                      ></v-textarea>
                      <div class="d-flex flex-column">
                        <v-btn
                          icon
                          size="x"
                          variant="text"
                          density="compact"
                          @click="formatText(index, 'superscript')"
                          title="Superscript"
                        >
                          <v-icon size="x">mdi-format-superscript</v-icon>
                        </v-btn>
                        <v-btn
                          icon
                          size="x"
                          variant="text"
                          density="compact"
                          @click="formatText(index, 'subscript')"
                          title="Subscript"
                        >
                          <v-icon size="x">mdi-format-subscript</v-icon>
                        </v-btn>
                      </div>
                    </div>
                  </td>
                  <td>
                    <v-text-field
                      v-model.number="element.value"
                      type="number"
                      step="0.01"
                      density="compact"
                      variant="outlined"
                      hide-details
                      @update:model-value="handleDataChange"
                    ></v-text-field>
                  </td>
                  <td>
                    <v-text-field
                      v-model.number="element.ci_lower"
                      type="number"
                      step="0.01"
                      density="compact"
                      variant="outlined"
                      hide-details
                      @update:model-value="handleDataChange"
                    ></v-text-field>
                  </td>
                  <td>
                    <v-text-field
                      v-model.number="element.ci_upper"
                      type="number"
                      step="0.01"
                      density="compact"
                      variant="outlined"
                      hide-details
                      @update:model-value="handleDataChange"
                    ></v-text-field>
                  </td>
                  <td>
                    <v-text-field
                      v-model.number="element.weight"
                      type="number"
                      step="0.01"
                      density="compact"
                      variant="outlined"
                      hide-details
                      placeholder="Optional"
                      @update:model-value="handleDataChange"
                    ></v-text-field>
                  </td>
                  <td class="text-center">
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      color="error"
                      @click="deleteRow(index)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </template>
            </draggable>
          </table>

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
        </div>

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
import { ref, computed, watch, toRaw } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useSessionStore } from '@/stores/session'
import type { ForestPlotData } from '@/types'
import { validateData } from '@/services/dataParser'
import CSVImporter from './CSVImporter.vue'
import ExcelImporter from './ExcelImporter.vue'
import draggable from 'vuedraggable'

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

// Textarea refs for text formatting
const textareaRefs = ref<Map<number, HTMLTextAreaElement>>(new Map())

const validationResult = computed(() => validateData(localData.value))
const validationErrors = computed(() => validationResult.value.errors)
const validationWarnings = computed(() => validationResult.value.warnings)

// Computed property for draggable to strip reactive proxies
const draggableData = computed({
  get: () => localData.value,
  set: (newValue) => {
    // Strip reactive proxies from array and all nested objects
    localData.value = toRaw(newValue).map(item => toRaw(item))
  }
})

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
      // Use toRaw to strip reactive proxies before saving to IndexedDB
      await sessionStore.updateData(toRaw(localData.value))
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
    outcome: '',
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

function handleDragChange() {
  // The computed setter already handles stripping reactive proxies
  // This handler exists in case we need additional logic after drag
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

// Track textarea elements for text formatting
function setTextareaRef(el: any, index: number) {
  if (el && el.$el) {
    // Vuetify v-textarea wraps the native textarea in $el
    const textarea = el.$el.querySelector('textarea')
    if (textarea) {
      textareaRefs.value.set(index, textarea)
    }
  }
}

// Unicode character mappings for superscript and subscript
const superscriptMap: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
  'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
  'A': 'ᴬ', 'B': 'ᴮ', 'D': 'ᴰ', 'E': 'ᴱ', 'G': 'ᴳ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ',
  'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'R': 'ᴿ', 'T': 'ᵀ', 'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾'
}

const subscriptMap: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎'
}

// Convert text to superscript or subscript
function convertToFormat(text: string, formatType: 'superscript' | 'subscript'): string {
  const map = formatType === 'superscript' ? superscriptMap : subscriptMap
  return text.split('').map(char => map[char] || char).join('')
}

// Format selected text in the textarea
function formatText(index: number, formatType: 'superscript' | 'subscript') {
  const textarea = textareaRefs.value.get(index)
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  // If no text is selected, do nothing
  if (start === end) {
    showSnackbar('Please select text to format', 'warning')
    return
  }

  const currentValue = localData.value[index]?.outcome || ''
  const selectedText = currentValue.substring(start, end)
  const formattedText = convertToFormat(selectedText, formatType)

  // Replace selected text with formatted version
  const newValue = currentValue.substring(0, start) + formattedText + currentValue.substring(end)
  localData.value[index].outcome = newValue

  // Restore cursor position after the formatted text
  // Use nextTick to ensure the DOM is updated
  setTimeout(() => {
    const newCursorPos = start + formattedText.length
    textarea.focus()
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  }, 0)

  handleDataChange()
}
</script>

<style scoped>
.data-editor {
  width: 100%;
}

.data-table-wrapper {
  background: white;
  border-radius: 4px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table thead th {
  background: rgb(var(--v-theme-surface));
  font-weight: 600;
  text-align: left;
  padding: 12px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.data-table tbody tr {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.data-table tbody tr:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.data-table tbody td {
  padding: 4px 8px;
  vertical-align: middle;
}

.drag-handle {
  cursor: grab;
  color: rgba(var(--v-theme-on-surface), 0.54);
}

.drag-handle:active {
  cursor: grabbing;
}

:deep(.sortable-ghost) {
  opacity: 0.4;
  background: rgba(var(--v-theme-primary), 0.1);
}

:deep(.sortable-drag) {
  opacity: 0.9;
  background: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style>
