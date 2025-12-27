<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="900">
    <v-card>
      <v-card-title>Import Excel File</v-card-title>

      <v-card-text>
        <v-file-input
          v-model="file"
          label="Select Excel file"
          accept=".xlsx,.xls"
          prepend-icon="mdi-file-excel"
          variant="outlined"
          @update:model-value="handleFileSelect"
        ></v-file-input>

        <v-row v-if="sheets.length > 0" class="mt-2">
          <v-col cols="6">
            <v-select
              v-model="selectedSheet"
              :items="sheets"
              label="Sheet"
              variant="outlined"
              density="compact"
              @update:model-value="parseExcelFile"
            ></v-select>
          </v-col>

          <v-col cols="6">
            <v-checkbox
              v-model="hasHeader"
              label="First row contains headers"
              density="compact"
              @update:model-value="parseExcelFile"
            ></v-checkbox>
          </v-col>
        </v-row>

        <v-row v-if="sheets.length > 0">
          <v-col cols="6">
            <v-text-field
              v-model.number="startRow"
              label="Start Row (0-based)"
              type="number"
              min="0"
              variant="outlined"
              density="compact"
              @update:model-value="parseExcelFile"
            ></v-text-field>
          </v-col>

          <v-col cols="6">
            <v-text-field
              v-model.number="endRow"
              label="End Row (optional)"
              type="number"
              min="0"
              variant="outlined"
              density="compact"
              placeholder="All rows"
              @update:model-value="parseExcelFile"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-alert v-if="parseResult" :type="parseResult.errors.length > 0 ? 'error' : 'success'" class="mt-4">
          <div v-if="parseResult.errors.length > 0">
            <div class="text-subtitle-2 mb-2">Errors:</div>
            <ul>
              <li v-for="(error, idx) in parseResult.errors.slice(0, 10)" :key="idx">{{ error }}</li>
            </ul>
            <div v-if="parseResult.errors.length > 10" class="mt-2">
              ... and {{ parseResult.errors.length - 10 }} more errors
            </div>
          </div>

          <div v-if="parseResult.warnings.length > 0" class="mt-2">
            <div class="text-subtitle-2 mb-2">Warnings:</div>
            <ul>
              <li v-for="(warning, idx) in parseResult.warnings.slice(0, 5)" :key="idx">{{ warning }}</li>
            </ul>
            <div v-if="parseResult.warnings.length > 5" class="mt-2">
              ... and {{ parseResult.warnings.length - 5 }} more warnings
            </div>
          </div>

          <div v-if="parseResult.data.length > 0" class="mt-2">
            Successfully parsed {{ parseResult.data.length }} rows
          </div>
        </v-alert>

        <div v-if="parseResult && parseResult.data.length > 0" class="mt-4">
          <div class="text-subtitle-1 mb-2">Preview (first 5 rows):</div>
          <v-table density="compact" class="elevation-1">
            <thead>
              <tr>
                <th>Study</th>
                <th>Effect</th>
                <th>Lower CI</th>
                <th>Upper CI</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in parseResult.data.slice(0, 5)" :key="idx">
                <td>{{ row.study }}</td>
                <td>{{ row.effect }}</td>
                <td>{{ row.ci_lower }}</td>
                <td>{{ row.ci_upper }}</td>
                <td>{{ row.weight ?? '-' }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <v-divider class="my-4"></v-divider>

        <div class="text-body-2">
          <strong>Expected Excel format:</strong>
          <div class="mt-2">
            <strong>Required columns:</strong> study, effect, ci_lower (or lower), ci_upper (or upper)
            <br>
            <strong>Optional columns:</strong> weight
            <br><br>
            The importer will automatically detect column headers with various naming conventions:
            <ul class="ml-4 mt-1">
              <li>Effect: effect, effect_size, es</li>
              <li>Lower CI: ci_lower, lower, cilower, lower_ci</li>
              <li>Upper CI: ci_upper, upper, ciupper, upper_ci</li>
              <li>Weight: weight, w</li>
            </ul>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          @click="importData"
          :disabled="!parseResult || parseResult.data.length === 0 || parseResult.errors.length > 0"
        >
          Import
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { parseExcel, getExcelSheets } from '@/services/dataParser'
import type { ParsedData, ForestPlotData } from '@/types'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'import': [data: ForestPlotData[]]
}>()

const file = ref<File[] | null>(null)
const fileBuffer = ref<ArrayBuffer | null>(null)
const sheets = ref<string[]>([])
const selectedSheet = ref<string>('')
const hasHeader = ref(true)
const startRow = ref<number>(0)
const endRow = ref<number | undefined>(undefined)
const parseResult = ref<ParsedData | null>(null)

async function handleFileSelect() {
  if (!file.value || file.value.length === 0) {
    reset()
    return
  }

  try {
    const selectedFile = file.value[0]
    if (!selectedFile) {
      reset()
      return
    }

    fileBuffer.value = await selectedFile.arrayBuffer()
    sheets.value = getExcelSheets(fileBuffer.value)

    if (sheets.value.length > 0) {
      selectedSheet.value = sheets.value[0] || ''
      if (selectedSheet.value) {
        parseExcelFile()
      }
    }
  } catch (error) {
    console.error('Failed to read Excel file:', error)
    parseResult.value = {
      data: [],
      errors: [`Failed to read file: ${error}`],
      warnings: [],
    }
  }
}

function parseExcelFile() {
  if (!fileBuffer.value || !selectedSheet.value) {
    return
  }

  try {
    parseResult.value = parseExcel(fileBuffer.value, {
      sheetName: selectedSheet.value,
      startRow: startRow.value,
      endRow: endRow.value,
      hasHeader: hasHeader.value,
    })
  } catch (error) {
    console.error('Failed to parse Excel file:', error)
    parseResult.value = {
      data: [],
      errors: [`Failed to parse Excel: ${error}`],
      warnings: [],
    }
  }
}

function importData() {
  if (parseResult.value && parseResult.value.data.length > 0) {
    emit('import', parseResult.value.data)
    close()
  }
}

function close() {
  emit('update:modelValue', false)
  reset()
}

function reset() {
  file.value = null
  fileBuffer.value = null
  sheets.value = []
  selectedSheet.value = ''
  hasHeader.value = true
  startRow.value = 0
  endRow.value = undefined
  parseResult.value = null
}
</script>

<style scoped>
</style>
