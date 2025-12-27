<template>
  <div class="data-editor">
    <v-card>
      <v-card-title class="d-flex align-center">
        <span>Data Editor</span>
        <v-spacer></v-spacer>
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
          @click="showImportMenu = true"
          size="small"
        >
          Import
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="localData"
          :items-per-page="10"
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

          <template v-slot:item.effect="{ item }">
            <v-text-field
              v-model.number="item.effect"
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

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="saveData"
          :disabled="validationErrors.length > 0 || localData.length === 0"
        >
          Save Data
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Import Menu -->
    <v-menu v-model="showImportMenu" :close-on-content-click="false">
      <template v-slot:activator="{ props }">
        <div v-bind="props" style="display: none"></div>
      </template>
      <v-list>
        <v-list-item @click="openCSVImport">
          <v-list-item-title>
            <v-icon start>mdi-file-delimited</v-icon>
            Import CSV
          </v-list-item-title>
        </v-list-item>
        <v-list-item @click="openExcelImport">
          <v-list-item-title>
            <v-icon start>mdi-file-excel</v-icon>
            Import Excel
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

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
import { useSessionStore } from '@/stores/session'
import type { ForestPlotData } from '@/types'
import { validateData } from '@/services/dataParser'
import CSVImporter from './CSVImporter.vue'
import ExcelImporter from './ExcelImporter.vue'

const sessionStore = useSessionStore()

const localData = ref<ForestPlotData[]>([])
const showImportMenu = ref(false)
const csvImportDialog = ref(false)
const excelImportDialog = ref(false)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const headers = [
  { title: 'Study', key: 'study', sortable: false, width: '25%' },
  { title: 'Effect Size', key: 'effect', sortable: false, width: '15%' },
  { title: 'Lower CI', key: 'ci_lower', sortable: false, width: '15%' },
  { title: 'Upper CI', key: 'ci_upper', sortable: false, width: '15%' },
  { title: 'Weight', key: 'weight', sortable: false, width: '15%' },
  { title: 'Actions', key: 'actions', sortable: false, width: '15%' },
]

const validationResult = computed(() => validateData(localData.value))
const validationErrors = computed(() => validationResult.value.errors)
const validationWarnings = computed(() => validationResult.value.warnings)

// Load data from active session
watch(
  () => sessionStore.activeDataVersion,
  (dataVersion) => {
    if (dataVersion) {
      localData.value = JSON.parse(JSON.stringify(dataVersion.data))
    } else {
      localData.value = []
    }
  },
  { immediate: true }
)

function addRow() {
  localData.value.push({
    study: '',
    effect: 0,
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
  // Trigger validation
  validateData(localData.value)
}

async function saveData() {
  if (validationErrors.value.length > 0) {
    showSnackbar('Please fix validation errors before saving', 'error')
    return
  }

  if (localData.value.length === 0) {
    showSnackbar('Cannot save empty dataset', 'error')
    return
  }

  try {
    await sessionStore.updateData(localData.value)
    showSnackbar('Data saved successfully', 'success')
  } catch (error) {
    console.error('Failed to save data:', error)
    showSnackbar('Failed to save data', 'error')
  }
}

function openCSVImport() {
  showImportMenu.value = false
  csvImportDialog.value = true
}

function openExcelImport() {
  showImportMenu.value = false
  excelImportDialog.value = true
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
