<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="800">
    <v-card>
      <v-card-title>Import CSV File</v-card-title>

      <v-card-text>
        <v-file-input
          v-model="file"
          label="Select CSV file"
          accept=".csv"
          prepend-icon="mdi-file-delimited"
          variant="outlined"
          @update:model-value="handleFileSelect"
        ></v-file-input>

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
          <strong>Expected CSV format:</strong>
          <pre class="mt-2 pa-2" style="background: #f5f5f5; border-radius: 4px; overflow-x: auto;">study,effect,ci_lower,ci_upper,weight
Study 1,1.5,1.2,1.8,100
Study 2,2.0,1.5,2.5,150
Study 3,1.8,1.4,2.2,120</pre>

          <div class="mt-2">
            <strong>Required columns:</strong> study, effect, ci_lower (or lower), ci_upper (or upper)
            <br>
            <strong>Optional columns:</strong> weight
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
import { parseCSV } from '@/services/dataParser'
import type { ParsedData, ForestPlotData } from '@/types'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'import': [data: ForestPlotData[]]
}>()

const file = ref<File[] | null>(null)
const parseResult = ref<ParsedData | null>(null)

async function handleFileSelect() {
  if (!file.value || file.value.length === 0) {
    parseResult.value = null
    return
  }

  try {
    const selectedFile = file.value[0]
    if (!selectedFile) {
      parseResult.value = null
      return
    }
    const text = await selectedFile.text()
    parseResult.value = parseCSV(text)
  } catch (error) {
    console.error('Failed to read CSV file:', error)
    parseResult.value = {
      data: [],
      errors: [`Failed to read file: ${error}`],
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
  file.value = null
  parseResult.value = null
}
</script>

<style scoped>
pre {
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
