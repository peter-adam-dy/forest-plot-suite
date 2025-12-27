<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="1000">
    <v-card>
      <v-card-title>Import CSV File</v-card-title>

      <v-card-text>
        <!-- Step 1: File Upload -->
        <v-file-input
          v-model="file"
          label="Select CSV file"
          accept=".csv"
          prepend-icon="mdi-file-delimited"
          variant="outlined"
        ></v-file-input>

        <!-- Step 2: Column Mapping -->
        <div v-if="rawData.length > 0" class="mt-4">
          <v-divider class="mb-4"></v-divider>
          <div class="text-h6 mb-3">Map Columns</div>

          <v-row>
            <v-col cols="6">
              <v-select
                v-model="columnMapping.study"
                :items="availableColumns"
                label="Study Column *"
                variant="outlined"
                density="compact"
                @update:model-value="updatePreview"
              ></v-select>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="columnMapping.effect"
                :items="availableColumns"
                label="Effect Size Column *"
                variant="outlined"
                density="compact"
                @update:model-value="updatePreview"
              ></v-select>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="4">
              <v-select
                v-model="columnMapping.ci_lower"
                :items="availableColumns"
                label="Lower CI Column *"
                variant="outlined"
                density="compact"
                @update:model-value="updatePreview"
              ></v-select>
            </v-col>
            <v-col cols="4">
              <v-select
                v-model="columnMapping.ci_upper"
                :items="availableColumns"
                label="Upper CI Column *"
                variant="outlined"
                density="compact"
                @update:model-value="updatePreview"
              ></v-select>
            </v-col>
            <v-col cols="4">
              <v-select
                v-model="columnMapping.weight"
                :items="[{ title: '(None)', value: null }, ...availableColumns]"
                label="Weight Column (Optional)"
                variant="outlined"
                density="compact"
                @update:model-value="updatePreview"
              ></v-select>
            </v-col>
          </v-row>

          <v-checkbox
            v-model="hasHeader"
            label="First row contains column headers"
            density="compact"
            @update:model-value="handleFileReparse"
          ></v-checkbox>
        </div>

        <!-- Validation Errors/Warnings -->
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

        <!-- Preview -->
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

        <!-- Raw Data Preview -->
        <div v-if="rawData.length > 0 && !parseResult" class="mt-4">
          <div class="text-subtitle-1 mb-2">Raw Data (first 5 rows):</div>
          <v-table density="compact" class="elevation-1">
            <thead>
              <tr>
                <th v-for="(col, idx) in Object.keys(rawData[0])" :key="idx">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in rawData.slice(0, 5)" :key="idx">
                <td v-for="(col, colIdx) in Object.keys(row)" :key="colIdx">{{ row[col] }}</td>
              </tr>
            </tbody>
          </v-table>
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
import { ref, watch } from 'vue'
import type { ParsedData, ForestPlotData } from '@/types'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'import': [data: ForestPlotData[]]
}>()

const file = ref<File[] | null>(null)

// Watch file changes
watch(file, (newVal) => {
  console.log('File ref changed:', newVal)
  if (newVal) {
    // Check if it's an array or a single file
    if (Array.isArray(newVal) && newVal.length > 0) {
      handleFileSelect()
    } else if (newVal instanceof File) {
      // Single file selected - convert to array format
      console.log('Single file detected, converting to array')
      file.value = [newVal]
    }
  }
})
const rawData = ref<any[]>([])
const hasHeader = ref(true)
const availableColumns = ref<{ title: string; value: string }[]>([])
const columnMapping = ref({
  study: null as string | null,
  effect: null as string | null,
  ci_lower: null as string | null,
  ci_upper: null as string | null,
  weight: null as string | null,
})
const parseResult = ref<ParsedData | null>(null)

async function handleFileSelect() {
  console.log('handleFileSelect called', file.value)

  if (!file.value || file.value.length === 0) {
    console.log('No file selected or empty array')
    reset()
    return
  }

  console.log('File array length:', file.value.length)

  try {
    const selectedFile = file.value[0]
    console.log('Selected file:', selectedFile)

    if (!selectedFile) {
      console.log('First file is undefined')
      reset()
      return
    }

    console.log('Reading file text...')
    const text = await selectedFile.text()
    console.log('File text length:', text.length)
    parseCSVRaw(text)
  } catch (error) {
    console.error('Failed to read CSV file:', error)
  }
}

function parseCSVRaw(csvText: string) {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    console.log('CSV is empty')
    return
  }

  console.log('Parsing CSV with', lines.length, 'lines')

  // Determine headers and data start
  let headers: string[]
  let dataStartIndex: number

  if (hasHeader.value) {
    // First line is header
    const headerLine = lines[0]
    if (!headerLine) return
    headers = headerLine.split(',').map(h => h.trim())
    dataStartIndex = 1
  } else {
    // No header - generate column names based on first row
    const firstLine = lines[0]
    if (!firstLine) return
    const firstValues = firstLine.split(',')
    headers = firstValues.map((_, idx) => `Column ${idx + 1}`)
    dataStartIndex = 0
  }

  console.log('Headers:', headers)
  console.log('Data starts at line:', dataStartIndex)

  // Parse raw data
  rawData.value = []
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const values = line.split(',').map(v => v.trim())

    const row: any = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    rawData.value.push(row)
  }

  console.log('Parsed', rawData.value.length, 'rows')

  // Setup available columns
  if (rawData.value.length > 0 && rawData.value[0]) {
    availableColumns.value = Object.keys(rawData.value[0]).map(key => ({
      title: key,
      value: key
    }))
    console.log('Available columns:', availableColumns.value)
  }

  // Auto-detect columns
  autoMapColumns()
}

function autoMapColumns() {
  const columns = availableColumns.value.map(c => c.value.toLowerCase())

  // Auto-map study
  const studyIdx = columns.findIndex(c =>
    c.includes('study') || c.includes('name') || c.includes('trial')
  )
  if (studyIdx !== -1 && availableColumns.value[studyIdx]) {
    columnMapping.value.study = availableColumns.value[studyIdx].value
  }

  // Auto-map effect
  const effectIdx = columns.findIndex(c =>
    c.includes('effect') || c.includes('hr') || c.includes('or') || c.includes('rr') || c.includes('ratio')
  )
  if (effectIdx !== -1 && availableColumns.value[effectIdx]) {
    columnMapping.value.effect = availableColumns.value[effectIdx].value
  }

  // Auto-map lower CI
  const lowerIdx = columns.findIndex(c =>
    c.includes('lower') || c.includes('ci_lower') || c.includes('cilower')
  )
  if (lowerIdx !== -1 && availableColumns.value[lowerIdx]) {
    columnMapping.value.ci_lower = availableColumns.value[lowerIdx].value
  }

  // Auto-map upper CI
  const upperIdx = columns.findIndex(c =>
    c.includes('upper') || c.includes('ci_upper') || c.includes('ciupper')
  )
  if (upperIdx !== -1 && availableColumns.value[upperIdx]) {
    columnMapping.value.ci_upper = availableColumns.value[upperIdx].value
  }

  // Auto-map weight
  const weightIdx = columns.findIndex(c =>
    c.includes('weight') || c === 'w'
  )
  if (weightIdx !== -1 && availableColumns.value[weightIdx]) {
    columnMapping.value.weight = availableColumns.value[weightIdx].value
  }

  // Trigger preview if we have required fields
  if (columnMapping.value.study && columnMapping.value.effect &&
      columnMapping.value.ci_lower && columnMapping.value.ci_upper) {
    updatePreview()
  }
}

function handleFileReparse() {
  if (file.value && file.value[0]) {
    file.value[0].text().then(text => parseCSVRaw(text))
  }
}

function updatePreview() {
  if (!columnMapping.value.study || !columnMapping.value.effect ||
      !columnMapping.value.ci_lower || !columnMapping.value.ci_upper) {
    parseResult.value = null
    return
  }

  const data: ForestPlotData[] = []
  const errors: string[] = []
  const warnings: string[] = []

  rawData.value.forEach((row, idx) => {
    const rowData = {
      study: row[columnMapping.value.study!],
      effect: row[columnMapping.value.effect!],
      ci_lower: row[columnMapping.value.ci_lower!],
      ci_upper: row[columnMapping.value.ci_upper!],
      weight: columnMapping.value.weight ? row[columnMapping.value.weight] : undefined,
    }

    // Validate
    if (!rowData.study || String(rowData.study).trim() === '') {
      errors.push(`Row ${idx + 1}: Study name is required`)
      return
    }

    const effect = Number(rowData.effect)
    const ciLower = Number(rowData.ci_lower)
    const ciUpper = Number(rowData.ci_upper)

    if (isNaN(effect)) {
      errors.push(`Row ${idx + 1}: Effect size must be a number`)
      return
    }
    if (isNaN(ciLower)) {
      errors.push(`Row ${idx + 1}: Lower CI must be a number`)
      return
    }
    if (isNaN(ciUpper)) {
      errors.push(`Row ${idx + 1}: Upper CI must be a number`)
      return
    }
    if (ciLower > ciUpper) {
      errors.push(`Row ${idx + 1}: Lower CI cannot be greater than Upper CI`)
      return
    }

    data.push({
      study: String(rowData.study),
      effect,
      ci_lower: ciLower,
      ci_upper: ciUpper,
      weight: rowData.weight ? Number(rowData.weight) : undefined,
    })
  })

  parseResult.value = { data, errors, warnings }
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
  rawData.value = []
  availableColumns.value = []
  columnMapping.value = {
    study: null,
    effect: null,
    ci_lower: null,
    ci_upper: null,
    weight: null,
  }
  parseResult.value = null
  hasHeader.value = true
}
</script>

<style scoped>
</style>
