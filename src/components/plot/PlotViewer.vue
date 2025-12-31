<template>
  <v-container fluid>
    <v-row v-if="!activeSession">
      <v-col>
        <v-alert type="info" variant="tonal">
          Please create or select a session to generate plots.
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-else-if="!hasData">
      <v-col>
        <v-alert type="warning" variant="tonal">
          <div class="text-h6 mb-2">No Data Available</div>
          <p class="mb-0">Please add data in the Data tab before generating a plot.</p>
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>Forest Plot</span>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              :loading="generating"
              :disabled="!webRReady || generating"
              @click="generatePlot"
            >
              <v-icon start>mdi-refresh</v-icon>
              {{ plotImage ? 'Regenerate' : 'Generate' }} Plot
            </v-btn>
          </v-card-title>

          <v-card-text>
            <!-- WebR Initialization Status -->
            <v-alert v-if="!webRReady && !initError" type="info" variant="tonal" class="mb-4">
              <div class="d-flex align-center">
                <v-progress-circular indeterminate size="20" width="2" class="mr-3"></v-progress-circular>
                <div>
                  <div class="text-subtitle-2">Initializing R Environment...</div>
                  <div class="text-caption">{{ initStatus }}</div>
                </div>
              </div>
            </v-alert>

            <!-- Initialization Error -->
            <v-alert v-if="initError" type="error" variant="tonal" class="mb-4">
              <div class="text-subtitle-2 mb-2">Failed to Initialize R Environment</div>
              <p class="text-caption mb-2">{{ initError }}</p>
              <v-btn size="small" @click="initializeWebR">Retry</v-btn>
            </v-alert>

            <!-- Data Validation Errors -->
            <v-alert v-if="validationErrors.length > 0" type="error" variant="tonal" class="mb-4">
              <div class="text-subtitle-2 mb-2">Data Validation Errors</div>
              <ul class="text-caption">
                <li v-for="(error, idx) in validationErrors.slice(0, 5)" :key="idx">{{ error }}</li>
              </ul>
              <div v-if="validationErrors.length > 5" class="text-caption mt-2">
                ... and {{ validationErrors.length - 5 }} more errors
              </div>
            </v-alert>

            <!-- Generation Error -->
            <v-alert v-if="generationError" type="error" variant="tonal" class="mb-4" closable @click:close="generationError = null">
              <div class="text-subtitle-2 mb-2">Plot Generation Error</div>
              <p class="text-caption mb-0">{{ generationError }}</p>
            </v-alert>

            <!-- Plot Image -->
            <div v-if="plotImage" class="plot-container">
              <v-img :src="plotImage" contain max-height="800" class="elevation-2"></v-img>

              <div class="mt-4 d-flex gap-2">
                <v-btn variant="outlined" @click="downloadPlot">
                  <v-icon start>mdi-download</v-icon>
                  Download PNG
                </v-btn>
                <v-btn variant="outlined" @click="copyToClipboard">
                  <v-icon start>mdi-content-copy</v-icon>
                  Copy to Clipboard
                </v-btn>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="webRReady && !generating" class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-1">mdi-chart-box-outline</v-icon>
              <h3 class="text-h6 mt-4 mb-2">No Plot Generated</h3>
              <p class="text-body-2 text-grey mb-4">
                Click "Generate Plot" to create your forest plot
              </p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Plot Statistics -->
      <v-col v-if="plotImage" cols="12" md="6">
        <v-card>
          <v-card-title>Plot Information</v-card-title>
          <v-card-text>
            <v-table density="compact">
              <tbody>
                <tr>
                  <td><strong>Number of Studies</strong></td>
                  <td>{{ currentData.length }}</td>
                </tr>
                <tr>
                  <td><strong>Effect Measure</strong></td>
                  <td>{{ activeSession.config.effectMeasure }}</td>
                </tr>
                <tr>
                  <td><strong>Axis Scale</strong></td>
                  <td>{{ axisTypeLabel }}</td>
                </tr>
                <tr>
                  <td><strong>Generated</strong></td>
                  <td>{{ generatedTime }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Data Summary -->
      <v-col v-if="plotImage" cols="12" md="6">
        <v-card>
          <v-card-title>Data Summary</v-card-title>
          <v-card-text>
            <v-table density="compact">
              <tbody>
                <tr>
                  <td><strong>Min Effect</strong></td>
                  <td>{{ dataStats.minEffect.toFixed(3) }}</td>
                </tr>
                <tr>
                  <td><strong>Max Effect</strong></td>
                  <td>{{ dataStats.maxEffect.toFixed(3) }}</td>
                </tr>
                <tr>
                  <td><strong>Mean Effect</strong></td>
                  <td>{{ dataStats.meanEffect.toFixed(3) }}</td>
                </tr>
                <tr>
                  <td><strong>Median Effect</strong></td>
                  <td>{{ dataStats.medianEffect.toFixed(3) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import { getWebRService } from '@/services/webr'
import { generateForestPlotCode, validateData } from '@/services/rCodeGenerator'
import { calculatePlotDimensions } from '@/utils/plotDimensions'
import type { AxisType } from '@/types'

const sessionStore = useSessionStore()
const activeSession = computed(() => sessionStore.activeSession)
const currentData = computed(() => sessionStore.activeDataVersion?.data || [])

const hasData = computed(() => currentData.value.length > 0)

// WebR state
const webRReady = ref(false)
const initStatus = ref('Loading WebR...')
const initError = ref<string | null>(null)

// Plot generation state
const generating = ref(false)
const plotImage = ref<string | null>(null)
const generatedTime = ref<string>('')
const generationError = ref<string | null>(null)
const validationErrors = ref<string[]>([])

// Axis type labels
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

// Data statistics
const dataStats = computed(() => {
  if (currentData.value.length === 0) {
    return { minEffect: 0, maxEffect: 0, meanEffect: 0, medianEffect: 0 }
  }

  const effects = currentData.value.map(d => d.effect)
  const sorted = [...effects].sort((a, b) => a - b)

  return {
    minEffect: Math.min(...effects),
    maxEffect: Math.max(...effects),
    meanEffect: effects.reduce((a, b) => a + b, 0) / effects.length,
    medianEffect: sorted[Math.floor(sorted.length / 2)] || 0,
  }
})

onMounted(() => {
  initializeWebR()
})

async function initializeWebR() {
  initError.value = null
  initStatus.value = 'Loading WebR...'

  try {
    const webR = getWebRService()

    if (webR.isReady()) {
      webRReady.value = true
      initStatus.value = 'Ready'
      return
    }

    initStatus.value = 'Initializing WebR environment...'
    await webR.initialize()

    initStatus.value = 'Installing R packages...'
    // Packages are installed during initialization

    webRReady.value = true
    initStatus.value = 'Ready'
  } catch (error) {
    console.error('WebR initialization failed:', error)
    initError.value = error instanceof Error ? error.message : 'Unknown error'
  }
}

async function generatePlot() {
  if (!activeSession.value || !webRReady.value) return

  generating.value = true
  generationError.value = null
  validationErrors.value = []

  try {
    // Validate data
    const validation = validateData(currentData.value)
    if (!validation.valid) {
      validationErrors.value = validation.errors
      generating.value = false
      return
    }

    // Generate R code
    const rCode = generateForestPlotCode(
      currentData.value,
      activeSession.value.config
    )

    // Store generated code in session
    await sessionStore.updateGeneratedCode(rCode)

    // Calculate plot dimensions
    const dimensions = calculatePlotDimensions(
      currentData.value.length,
      activeSession.value.config
    )

    // Execute R code and generate plot
    const webR = getWebRService()
    const imageDataUrl = await webR.generatePlot(
      rCode,
      activeSession.value.config.dpi,
      dimensions.width,
      dimensions.height
    )

    plotImage.value = imageDataUrl
    generatedTime.value = new Date().toLocaleString()
  } catch (error) {
    console.error('Plot generation failed:', error)
    generationError.value = error instanceof Error ? error.message : 'Unknown error'
  } finally {
    generating.value = false
  }
}

function downloadPlot() {
  if (!plotImage.value) return

  const link = document.createElement('a')
  link.href = plotImage.value
  link.download = `forest-plot-${Date.now()}.png`
  link.click()
}

async function copyToClipboard() {
  if (!plotImage.value) return

  try {
    // Convert data URL to blob
    const response = await fetch(plotImage.value)
    const blob = await response.blob()

    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])

    // Could show a success message here
    console.log('Plot copied to clipboard')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}
</script>

<style scoped>
.plot-container {
  max-width: 100%;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
