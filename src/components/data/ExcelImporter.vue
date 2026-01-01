<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="1100">
    <v-card>
      <v-card-title>Import Excel File</v-card-title>

      <v-card-text>
        <!-- Step 1: File Upload -->
        <v-file-input
          v-model="file"
          label="Select Excel or CSV file"
          accept=".xlsx,.xls,.csv,.tsv"
          prepend-icon="mdi-file-excel"
          variant="outlined"
        ></v-file-input>

        <!-- CSV Delimiter Selector -->
        <v-row v-if="isCSVFile && file" class="mt-2">
          <v-col cols="6">
            <v-select
              v-model="delimiter"
              :items="delimiterOptions"
              label="Delimiter"
              variant="outlined"
              density="compact"
              @update:model-value="reparseFile"
            ></v-select>
          </v-col>
          <v-col cols="6">
            <v-checkbox
              v-model="hasHeader"
              label="First row/column has headers"
              density="compact"
              @update:model-value="reparseFile"
            ></v-checkbox>
          </v-col>
        </v-row>

        <!-- Step 2: Sheet and Options (Excel only) -->
        <div v-if="sheets.length > 0 && !isCSVFile" class="mt-4">
          <v-divider class="mb-4"></v-divider>
          <div class="text-h6 mb-3">Import Options</div>

          <v-row>
            <v-col cols="6">
              <v-select
                v-model="selectedSheet"
                :items="sheets"
                label="Sheet"
                variant="outlined"
                density="compact"
                @update:model-value="parseSheet"
              ></v-select>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="orientation"
                :items="[
                  { title: 'Studies in Rows (Standard)', value: 'rows' },
                  { title: 'Studies in Columns (Transposed)', value: 'columns' }
                ]"
                label="Data Orientation"
                variant="outlined"
                density="compact"
                @update:model-value="parseSheet"
              ></v-select>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="4">
              <v-text-field
                v-model.number="startRow"
                label="Start Row (1-based)"
                type="number"
                min="1"
                variant="outlined"
                density="compact"
                @update:model-value="parseSheet"
              ></v-text-field>
            </v-col>
            <v-col cols="4">
              <v-text-field
                v-model.number="endRow"
                label="End Row (optional)"
                type="number"
                min="1"
                variant="outlined"
                density="compact"
                placeholder="All rows"
                @update:model-value="parseSheet"
              ></v-text-field>
            </v-col>
            <v-col cols="4">
              <v-checkbox
                v-model="hasHeader"
                label="First row/column has headers"
                density="compact"
                @update:model-value="parseSheet"
              ></v-checkbox>
            </v-col>
          </v-row>
        </div>

        <!-- Step 3: Column/Row Mapping -->
        <div v-if="rawData.length > 0" class="mt-4">
          <v-divider class="mb-4"></v-divider>
          <div class="text-h6 mb-3">Map {{ orientation === 'rows' ? 'Columns' : 'Rows' }}</div>

          <v-row>
            <v-col cols="6">
              <v-select
                v-model="columnMapping.outcome"
                :items="availableColumns"
                :label="`Study ${orientation === 'rows' ? 'Column' : 'Row'} *`"
                variant="outlined"
                density="compact"
                @update:model-value="updatePreview"
              ></v-select>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="columnMapping.value"
                :items="availableColumns"
                :label="`Value ${orientation === 'rows' ? 'Column' : 'Row'} *`"
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
                :label="`Lower CI ${orientation === 'rows' ? 'Column' : 'Row'} *`"
                variant="outlined"
                density="compact"
                @update:model-value="updatePreview"
              ></v-select>
            </v-col>
            <v-col cols="4">
              <v-select
                v-model="columnMapping.ci_upper"
                :items="availableColumns"
                :label="`Upper CI ${orientation === 'rows' ? 'Column' : 'Row'} *`"
                variant="outlined"
                density="compact"
                @update:model-value="updatePreview"
              ></v-select>
            </v-col>
            <v-col cols="4">
              <v-select
                v-model="columnMapping.weight"
                :items="[{ title: '(None)', value: null }, ...availableColumns]"
                :label="`Weight ${orientation === 'rows' ? 'Column' : 'Row'} (Optional)`"
                variant="outlined"
                density="compact"
                @update:model-value="updatePreview"
              ></v-select>
            </v-col>
          </v-row>
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
            Successfully parsed {{ parseResult.data.length }} {{ orientation === 'rows' ? 'rows' : 'columns' }}
          </div>
        </v-alert>

        <!-- Preview -->
        <div v-if="parseResult && parseResult.data.length > 0" class="mt-4">
          <div class="text-subtitle-1 mb-2">Preview (first 5 studies):</div>
          <v-table density="compact" class="elevation-1">
            <thead>
              <tr>
                <th>Outcome</th>
                <th>Value</th>
                <th>Lower CI</th>
                <th>Upper CI</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in parseResult.data.slice(0, 5)" :key="idx">
                <td>{{ row.outcome }}</td>
                <td>{{ row.value }}</td>
                <td>{{ row.ci_lower }}</td>
                <td>{{ row.ci_upper }}</td>
                <td>{{ row.weight ?? '-' }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- Raw Data Preview -->
        <div v-if="rawData.length > 0 && !parseResult" class="mt-4">
          <div class="text-subtitle-1 mb-2">Raw Data (first 5 {{ orientation === 'rows' ? 'rows' : 'columns' }}):</div>
          <v-table density="compact" class="elevation-1" style="max-height: 300px; overflow: auto;">
            <thead>
              <tr>
                <th v-for="(col, idx) in Object.keys(rawData[0] || {})" :key="idx">{{ col }}</th>
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
import { ref, computed, watch } from 'vue'
import { getExcelSheets } from '@/services/dataParser'
import { parseNumber } from '@/utils/numberParser'
import type { ParsedData, ForestPlotData } from '@/types'
import * as XLSX from 'xlsx'

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
const orientation = ref<'rows' | 'columns'>('rows')
const hasHeader = ref(true)
const startRow = ref<number>(1)
const endRow = ref<number | string | undefined>(undefined)
const delimiter = ref<string>(',')
const delimiterOptions = [
  { title: 'Comma (,)', value: ',' },
  { title: 'Semicolon (;)', value: ';' },
  { title: 'Tab (\\t)', value: '\t' },
  { title: 'Pipe (|)', value: '|' },
  { title: 'Space ( )', value: ' ' },
]
const rawData = ref<any[]>([])
const availableColumns = ref<{ title: string; value: string }[]>([])
const columnMapping = ref({
  outcome: null as string | null,
  value: null as string | null,
  ci_lower: null as string | null,
  ci_upper: null as string | null,
  weight: null as string | null,
})
const parseResult = ref<ParsedData | null>(null)

const isCSVFile = computed(() => {
  if (!file.value || file.value.length === 0) return false
  const fileName = file.value[0]?.name || ''
  return fileName.toLowerCase().endsWith('.csv') || fileName.toLowerCase().endsWith('.tsv')
})

// Watch for file changes and convert single File to array if needed
watch(file, (newVal) => {
  console.log('File ref changed:', newVal)
  if (newVal) {
    if (Array.isArray(newVal) && newVal.length > 0) {
      console.log('File is array with length:', newVal.length)
      handleFileSelect()
    } else if (newVal instanceof File) {
      console.log('File is single File object, converting to array')
      file.value = [newVal]
    }
  }
})

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

    if (isCSVFile.value) {
      // Handle CSV/TSV files
      const text = await selectedFile.text()
      parseCSVFile(text)
    } else {
      // Handle Excel files
      fileBuffer.value = await selectedFile.arrayBuffer()
      sheets.value = getExcelSheets(fileBuffer.value)

      if (sheets.value.length > 0) {
        selectedSheet.value = sheets.value[0] || ''
        if (selectedSheet.value) {
          parseSheet()
        }
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
}

async function reparseFile() {
  if (!file.value || file.value.length === 0) return

  const selectedFile = file.value[0]
  if (!selectedFile) return

  try {
    if (isCSVFile.value) {
      // Re-parse CSV with new delimiter or header setting
      const text = await selectedFile.text()
      parseCSVFile(text)
    } else {
      // For Excel files, re-parse the sheet
      parseSheet()
    }
  } catch (error) {
    console.error('Failed to reparse file:', error)
  }
}

function parseCSVFile(csvText: string) {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    console.log('CSV is empty')
    return
  }

  // Determine headers and data start
  let headers: string[]
  let dataStartIndex: number

  if (hasHeader.value) {
    // First line is header
    const headerLine = lines[0]
    if (!headerLine) return
    headers = headerLine.split(delimiter.value).map(h => h.trim())
    dataStartIndex = 1
  } else {
    // No header - generate column names based on first row
    const firstLine = lines[0]
    if (!firstLine) return
    const firstValues = firstLine.split(delimiter.value)
    headers = firstValues.map((_, idx) => `Column ${idx + 1}`)
    dataStartIndex = 0
  }

  // Parse raw data
  rawData.value = []
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const values = line.split(delimiter.value).map(v => v.trim())

    const row: any = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    rawData.value.push(row)
  }

  // Setup available columns
  if (rawData.value.length > 0 && rawData.value[0]) {
    availableColumns.value = Object.keys(rawData.value[0]).map(key => ({
      title: key,
      value: key
    }))
  }

  // Auto-detect columns
  autoMapColumns()
}

function parseSheet() {
  if (!fileBuffer.value || !selectedSheet.value) return

  try {
    const workbook = XLSX.read(fileBuffer.value, { type: 'array' })
    const sheet = workbook.Sheets[selectedSheet.value]
    if (!sheet) return

    // Get sheet range
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
    const actualStartRow = Math.max(0, (startRow.value || 1) - 1)
    const actualEndRow = endRow.value ? Number(endRow.value) - 1 : range.e.r

    if (orientation.value === 'rows') {
      parseRowOriented(sheet, actualStartRow, actualEndRow)
    } else {
      parseColumnOriented(sheet, actualStartRow, actualEndRow)
    }
  } catch (error) {
    console.error('Failed to parse Excel sheet:', error)
  }
}

function parseRowOriented(sheet: XLSX.WorkSheet, startRow: number, endRow: number) {
  const jsonData = XLSX.utils.sheet_to_json(sheet, {
    header: hasHeader.value ? undefined : 1,
    range: startRow,
    blankrows: false,
  })

  // Limit to endRow
  const limitedData = endRow ? jsonData.slice(0, endRow - startRow + 1) : jsonData

  // Convert to our format
  rawData.value = limitedData.map((row: any) => {
    const newRow: any = {}
    for (const key in row) {
      newRow[key] = row[key]
    }
    return newRow
  })

  // Setup available columns
  if (rawData.value[0]) {
    availableColumns.value = Object.keys(rawData.value[0]).map(key => ({
      title: key,
      value: key
    }))
  }

  autoMapColumns()
}

function parseColumnOriented(sheet: XLSX.WorkSheet, startCol: number, endCol: number) {
  // For column-oriented data, we need to transpose
  const jsonData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
  }) as any[][]

  if (jsonData.length === 0) return

  // Transpose the data
  const maxCols = Math.max(...jsonData.map(row => row.length))
  const transposed: any[] = []

  for (let col = startCol; col < maxCols; col++) {
    if (endCol && col > endCol) break

    const transposedRow: any = {}
    jsonData.forEach((row, rowIdx) => {
      const header = hasHeader.value ? String(row[0] || `Row ${rowIdx + 1}`) : `Row ${rowIdx + 1}`
      transposedRow[header] = row[col]
    })
    transposed.push(transposedRow)
  }

  rawData.value = transposed

  // Setup available columns (which are actually rows in the original)
  if (rawData.value[0]) {
    availableColumns.value = Object.keys(rawData.value[0]).map(key => ({
      title: key,
      value: key
    }))
  }

  autoMapColumns()
}

function autoMapColumns() {
  const columns = availableColumns.value.map(c => c.value.toLowerCase())

  // Auto-map outcome
  const outcomeIdx = columns.findIndex(c =>
    c.includes('study') || c.includes('name') || c.includes('trial')
  )
  if (outcomeIdx !== -1 && availableColumns.value[outcomeIdx]) {
    columnMapping.value.outcome = availableColumns.value[outcomeIdx].value
  }

  // Auto-map value
  const valueIdx = columns.findIndex(c =>
    c.includes('value') || c.includes('effect') || c.includes('hr') || c.includes('or') || c.includes('rr') || c.includes('ratio')
  )
  if (valueIdx !== -1 && availableColumns.value[valueIdx]) {
    columnMapping.value.value = availableColumns.value[valueIdx].value
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
  if (columnMapping.value.outcome && columnMapping.value.value &&
      columnMapping.value.ci_lower && columnMapping.value.ci_upper) {
    updatePreview()
  }
}

function updatePreview() {
  if (!columnMapping.value.outcome || !columnMapping.value.value ||
      !columnMapping.value.ci_lower || !columnMapping.value.ci_upper) {
    parseResult.value = null
    return
  }

  const data: ForestPlotData[] = []
  const errors: string[] = []
  const warnings: string[] = []

  rawData.value.forEach((row, idx) => {
    const rowData = {
      outcome: row[columnMapping.value.outcome!],
      value: row[columnMapping.value.value!],
      ci_lower: row[columnMapping.value.ci_lower!],
      ci_upper: row[columnMapping.value.ci_upper!],
      weight: columnMapping.value.weight ? row[columnMapping.value.weight] : undefined,
    }

    // Validate
    if (!rowData.outcome || String(rowData.outcome).trim() === '') {
      errors.push(`${orientation.value === 'rows' ? 'Row' : 'Column'} ${idx + 1}: Outcome name is required`)
      return
    }

    const value = parseNumber(rowData.value)
    const ciLower = parseNumber(rowData.ci_lower)
    const ciUpper = parseNumber(rowData.ci_upper)

    if (isNaN(value)) {
      errors.push(`${orientation.value === 'rows' ? 'Row' : 'Column'} ${idx + 1}: Value must be a number`)
      return
    }
    if (isNaN(ciLower)) {
      errors.push(`${orientation.value === 'rows' ? 'Row' : 'Column'} ${idx + 1}: Lower CI must be a number`)
      return
    }
    if (isNaN(ciUpper)) {
      errors.push(`${orientation.value === 'rows' ? 'Row' : 'Column'} ${idx + 1}: Upper CI must be a number`)
      return
    }
    if (ciLower > ciUpper) {
      errors.push(`${orientation.value === 'rows' ? 'Row' : 'Column'} ${idx + 1}: Lower CI cannot be greater than Upper CI`)
      return
    }

    data.push({
      outcome: String(rowData.outcome),
      value,
      ci_lower: ciLower,
      ci_upper: ciUpper,
      weight: rowData.weight ? parseNumber(rowData.weight) : undefined,
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
  fileBuffer.value = null
  sheets.value = []
  selectedSheet.value = ''
  orientation.value = 'rows'
  hasHeader.value = true
  startRow.value = 1
  endRow.value = undefined
  delimiter.value = ','
  rawData.value = []
  availableColumns.value = []
  columnMapping.value = {
    outcome: null,
    value: null,
    ci_lower: null,
    ci_upper: null,
    weight: null,
  }
  parseResult.value = null
}
</script>

<style scoped>
</style>
