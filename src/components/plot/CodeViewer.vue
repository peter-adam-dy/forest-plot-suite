<template>
  <v-container fluid>
    <v-row v-if="!activeSession">
      <v-col>
        <v-alert type="info" variant="tonal">
          Please create or select a session to view R code.
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>Generated R Code</span>
            <v-spacer></v-spacer>
            <v-btn
              v-if="rCode"
              variant="outlined"
              @click="copyCode"
              class="mr-2"
            >
              <v-icon start>mdi-content-copy</v-icon>
              Copy Code
            </v-btn>
            <v-btn
              v-if="rCode"
              variant="outlined"
              @click="downloadCode"
            >
              <v-icon start>mdi-download</v-icon>
              Download .R
            </v-btn>
          </v-card-title>

          <v-card-text>
            <div v-if="!rCode" class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-1">mdi-code-braces</v-icon>
              <h3 class="text-h6 mt-4 mb-2">No Code Generated</h3>
              <p class="text-body-2 text-grey mb-4">
                Generate a plot in the Plot tab to see the R code
              </p>
            </div>

            <div v-else>
              <v-alert type="info" variant="tonal" class="mb-4">
                <div class="text-subtitle-2 mb-2">How to use this code:</div>
                <ol class="text-caption mb-0">
                  <li>Copy the code below</li>
                  <li>Open R or RStudio</li>
                  <li>Install required packages if needed: install.packages(c("meta", "metafor"))</li>
                  <li>Paste and run the code</li>
                </ol>
              </v-alert>

              <div class="code-container">
                <pre class="code-block"><code>{{ rCode }}</code></pre>
              </div>

              <!-- Data Info -->
              <v-expansion-panels class="mt-4">
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon start>mdi-information</v-icon>
                    Code Information
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-table density="compact">
                      <tbody>
                        <tr>
                          <td><strong>Number of Studies</strong></td>
                          <td>{{ currentData.length }}</td>
                        </tr>
                        <tr>
                          <td><strong>Axis Scale</strong></td>
                          <td>{{ axisTypeLabel }}</td>
                        </tr>
                        <tr>
                          <td><strong>Packages Required</strong></td>
                          <td>meta, metafor, grid</td>
                        </tr>
                        <tr>
                          <td><strong>Last Updated</strong></td>
                          <td>{{ lastModified }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import type { AxisType } from '@/types'

const sessionStore = useSessionStore()
const activeSession = computed(() => sessionStore.activeSession)
const currentData = computed(() => sessionStore.activeDataVersion?.data || [])

const rCode = computed(() => activeSession.value?.generatedCode || '')

const lastModified = computed(() => {
  if (!activeSession.value) return ''
  return new Date(activeSession.value.modified).toLocaleString()
})

const axisTypeLabels: Record<AxisType, string> = {
  linear: 'Linear',
  log2: 'Log base 2',
  loge: 'Natural Log (ln)',
  log10: 'Log base 10',
}

const axisTypeLabel = computed(() => {
  if (!activeSession.value) return ''
  return axisTypeLabels[activeSession.value.config.axisType]
})

async function copyCode() {
  if (!rCode.value) return

  try {
    await navigator.clipboard.writeText(rCode.value)
    console.log('Code copied to clipboard')
    // Could show a success snackbar here
  } catch (error) {
    console.error('Failed to copy code:', error)
  }
}

function downloadCode() {
  if (!rCode.value) return

  const blob = new Blob([rCode.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `forest-plot-${Date.now()}.R`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.code-container {
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: auto;
  max-height: 600px;
}

.code-block {
  margin: 0;
  padding: 16px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  white-space: pre;
  overflow-x: auto;
}
</style>
