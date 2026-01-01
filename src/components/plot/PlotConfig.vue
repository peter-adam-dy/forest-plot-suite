<template>
  <v-container fluid>
    <v-alert v-if="!activeSession" type="info" variant="tonal" class="mb-4">
      Please create or select a session to configure plot settings.
    </v-alert>

    <div v-else>
      <v-card class="mb-4">
        <v-card-title>Plot Content</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="config.title"
              label="Title"
              variant="outlined"
              density="compact"
              class="mb-3"
              @update:model-value="updateConfig"
            ></v-text-field>

            <v-text-field
              v-model="config.subtitle"
              label="Subtitle"
              variant="outlined"
              density="compact"
              class="mb-3"
              @update:model-value="updateConfig"
            ></v-text-field>

            <v-text-field
              v-model="config.xLabel"
              label="X-Axis Label"
              variant="outlined"
              density="compact"
              class="mb-3"
              @update:model-value="updateConfig"
            ></v-text-field>

            <v-text-field
              v-model="config.yLabel"
              label="Y-Axis Label"
              variant="outlined"
              density="compact"
              class="mb-3"
              @update:model-value="updateConfig"
            ></v-text-field>
          </v-card-text>
        </v-card>

      <v-card class="mb-4">
        <v-card-title>Axis Settings</v-card-title>
          <v-card-text>
            <v-select
              v-model="config.axisType"
              :items="axisTypeOptions"
              label="X-Axis Scale"
              variant="outlined"
              density="compact"
              class="mb-3"
              @update:model-value="updateConfig"
            ></v-select>

            <v-radio-group
              v-model="limitsMode"
              inline
              density="compact"
              class="mb-2"
              @update:model-value="handleLimitsModeChange"
            >
              <v-radio label="Auto Limits" value="auto"></v-radio>
              <v-radio label="Manual Limits" value="manual"></v-radio>
            </v-radio-group>

            <v-row v-if="limitsMode === 'manual'">
              <v-col cols="6">
                <v-text-field
                  v-model.number="manualLimits[0]"
                  label="X-Axis Min"
                  type="number"
                  step="0.1"
                  variant="outlined"
                  density="compact"
                  @update:model-value="updateManualLimits"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model.number="manualLimits[1]"
                  label="X-Axis Max"
                  type="number"
                  step="0.1"
                  variant="outlined"
                  density="compact"
                  @update:model-value="updateManualLimits"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-text-field
              v-model.number="config.referenceLineValue"
              label="Vertical Reference Line"
              type="number"
              step="0.1"
              variant="outlined"
              density="compact"
              class="mt-3"
              clearable
              hint="Dotted vertical line (default: 1). Click ✕ to hide"
              persistent-hint
              @update:model-value="updateConfig"
            ></v-text-field>

            <v-radio-group
              v-model="breaksMode"
              inline
              density="compact"
              class="mb-2 mt-4"
              @update:model-value="handleBreaksModeChange"
            >
              <v-radio label="Auto Tick Positions" value="auto"></v-radio>
              <v-radio label="Custom Tick Positions" value="manual"></v-radio>
            </v-radio-group>

            <v-textarea
              v-if="breaksMode === 'manual'"
              v-model="breaksInput"
              label="Tick Positions"
              variant="outlined"
              density="compact"
              rows="3"
              placeholder="0.5, 1, 2, 5, 10"
              hint="Enter numbers separated by commas or newlines"
              persistent-hint
              @update:model-value="updateCustomBreaks"
            ></v-textarea>
          </v-card-text>
        </v-card>

      <v-card class="mb-4">
        <v-card-title>Visual Style</v-card-title>
          <v-card-text>
            <v-slider
              v-model="config.pointSize"
              label="Point Size"
              :min="1"
              :max="10"
              :step="0.5"
              thumb-label
              class="mb-3"
              @update:model-value="updateConfig"
            ></v-slider>

            <v-select
              v-model="config.colorScheme"
              :items="colorSchemeOptions"
              label="Color Scheme"
              variant="outlined"
              density="compact"
              class="mb-3"
              @update:model-value="updateConfig"
            ></v-select>

            <v-checkbox
              v-model="config.showValues"
              label="Show values and confidence intervals"
              density="compact"
              @update:model-value="updateConfig"
            ></v-checkbox>

            <v-checkbox
              v-model="config.showGridLines"
              label="Show vertical grid lines on x-axis"
              density="compact"
              @update:model-value="updateConfig"
            ></v-checkbox>
          </v-card-text>
        </v-card>

      <v-card class="mb-4">
        <v-card-title>Export Settings</v-card-title>
          <v-card-text>
            <v-select
              v-model="config.dpi"
              :items="dpiOptions"
              label="Resolution (DPI)"
              variant="outlined"
              density="compact"
              class="mb-3"
              @update:model-value="updateConfig"
            ></v-select>

            <v-radio-group
              v-model="dimensionsMode"
              inline
              density="compact"
              class="mb-2"
              @update:model-value="handleDimensionsModeChange"
            >
              <v-radio label="Auto Dimensions" value="auto"></v-radio>
              <v-radio label="Manual Dimensions" value="manual"></v-radio>
            </v-radio-group>

            <v-row v-if="dimensionsMode === 'manual'">
              <v-col cols="6">
                <v-text-field
                  v-model.number="manualWidth"
                  label="Width (inches)"
                  type="number"
                  step="0.5"
                  :min="4"
                  :max="24"
                  variant="outlined"
                  density="compact"
                  @update:model-value="handleManualDimensionsChange"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model.number="manualHeight"
                  label="Height (inches)"
                  type="number"
                  step="0.5"
                  :min="4"
                  :max="32"
                  variant="outlined"
                  density="compact"
                  @update:model-value="handleManualDimensionsChange"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-alert
              v-if="dimensionsMode === 'auto'"
              type="info"
              variant="tonal"
              density="compact"
              class="mt-2"
            >
              Dimensions calculated from study count
            </v-alert>
          </v-card-text>
        </v-card>

      <v-card>
        <v-card-title>Preview Settings</v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Setting</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Title</td>
                  <td>{{ config.title || '(none)' }}</td>
                </tr>
                <tr>
                  <td>Subtitle</td>
                  <td>{{ config.subtitle || '(none)' }}</td>
                </tr>
                <tr>
                  <td>X-Axis Scale</td>
                  <td>{{ axisTypeLabels[config.axisType] }}</td>
                </tr>
                <tr>
                  <td>X-Axis Limits</td>
                  <td>{{ config.xLimits === 'auto' ? 'Auto' : `[${config.xLimits[0]}, ${config.xLimits[1]}]` }}</td>
                </tr>
                <tr>
                  <td>Reference Line</td>
                  <td>{{ config.referenceLineValue !== null && config.referenceLineValue !== undefined ? `x = ${config.referenceLineValue}` : 'Hidden' }}</td>
                </tr>
                <tr>
                  <td>X-Axis Tick Positions</td>
                  <td>{{ config.xBreaks === 'auto' ? 'Auto' : config.xBreaks.join(', ') }}</td>
                </tr>
                <tr>
                  <td>Point Size</td>
                  <td>{{ config.pointSize }}</td>
                </tr>
                <tr>
                  <td>Color Scheme</td>
                  <td>{{ config.colorScheme }}</td>
                </tr>
                <tr>
                  <td>Show Values</td>
                  <td>{{ config.showValues ? 'Yes' : 'No' }}</td>
                </tr>
                <tr>
                  <td>Show Grid Lines</td>
                  <td>{{ config.showGridLines ? 'Yes' : 'No' }}</td>
                </tr>
                <tr>
                  <td>DPI</td>
                  <td>{{ config.dpi }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSessionStore } from '@/stores/session'
import type { PlotConfig, AxisType } from '@/types'

const sessionStore = useSessionStore()
const activeSession = computed(() => sessionStore.activeSession)

// Local config state
const config = ref<PlotConfig>({
  axisType: 'linear',
  xLimits: 'auto',
  xBreaks: 'auto',
  title: 'Forest Plot',
  subtitle: '',
  xLabel: 'Value',
  yLabel: 'Study',
  dpi: 300,
  pointSize: 3,
  colorScheme: 'monochrome',
  showValues: true,
  showGridLines: false,
  referenceLineValue: 1,
  width: 'auto',
  height: 'auto',
})

// Limits mode handling
const limitsMode = ref<'auto' | 'manual'>('auto')
const manualLimits = ref<[number, number]>([0, 1])

// Breaks mode handling
const breaksMode = ref<'auto' | 'manual'>('auto')
const breaksInput = ref<string>('')

// Dimensions mode handling
const dimensionsMode = ref<'auto' | 'manual'>('auto')
const manualWidth = ref<number>(10)
const manualHeight = ref<number>(8)

// Options
const axisTypeOptions = [
  { title: 'Linear', value: 'linear' },
  { title: 'Log base 2', value: 'log2' },
  { title: 'Natural Log (ln)', value: 'loge' },
  { title: 'Log base 10', value: 'log10' },
]

const axisTypeLabels: Record<AxisType, string> = {
  linear: 'Linear',
  log2: 'Log base 2',
  loge: 'Natural Log (ln)',
  log10: 'Log base 10',
}

const dpiOptions = [
  { title: '72 DPI (Screen)', value: 72 },
  { title: '150 DPI (Draft)', value: 150 },
  { title: '300 DPI (Publication)', value: 300 },
  { title: '600 DPI (High Quality)', value: 600 },
]

const colorSchemeOptions = [
  { title: 'Default', value: 'default' },
  { title: 'Monochrome', value: 'monochrome' },
  { title: 'Colorblind Safe', value: 'colorblind' },
  { title: 'Dark', value: 'dark' },
  { title: 'Light', value: 'light' },
]

// Watch active session and load its config
watch(activeSession, (session) => {
  if (session) {
    config.value = {
      ...session.config,
      // Set defaults for new fields ONLY if undefined (for old sessions), not if null (user cleared it)
      referenceLineValue: session.config.referenceLineValue !== undefined ? session.config.referenceLineValue : 1,
      showGridLines: session.config.showGridLines ?? false,
      xBreaks: session.config.xBreaks ?? 'auto'
    }

    // Set limits mode based on config
    if (session.config.xLimits === 'auto') {
      limitsMode.value = 'auto'
    } else {
      limitsMode.value = 'manual'
      manualLimits.value = [...session.config.xLimits]
    }

    // Set breaks mode based on config
    if (session.config.xBreaks === 'auto' || !session.config.xBreaks) {
      breaksMode.value = 'auto'
      breaksInput.value = ''
    } else {
      breaksMode.value = 'manual'
      breaksInput.value = session.config.xBreaks.join(', ')
    }

    // Set dimensions mode based on config
    if (session.config.width === 'auto' && session.config.height === 'auto') {
      dimensionsMode.value = 'auto'
    } else {
      dimensionsMode.value = 'manual'
      if (typeof session.config.width === 'number') {
        manualWidth.value = session.config.width
      }
      if (typeof session.config.height === 'number') {
        manualHeight.value = session.config.height
      }
    }
  }
}, { immediate: true })

function handleLimitsModeChange(mode: 'auto' | 'manual' | null) {
  if (!mode) return

  if (mode === 'auto') {
    config.value.xLimits = 'auto'
  } else {
    config.value.xLimits = [manualLimits.value[0], manualLimits.value[1]]
  }
  updateConfig()
}

function updateManualLimits() {
  if (limitsMode.value === 'manual') {
    config.value.xLimits = [manualLimits.value[0], manualLimits.value[1]]
    updateConfig()
  }
}

function handleBreaksModeChange(mode: 'auto' | 'manual' | null) {
  if (!mode) return

  if (mode === 'auto') {
    config.value.xBreaks = 'auto'
  } else {
    updateCustomBreaks(breaksInput.value)
  }
  updateConfig()
}

function updateCustomBreaks(input: string) {
  if (breaksMode.value !== 'manual') return

  // Parse comma or newline separated numbers
  const values = input
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => parseFloat(s))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b)  // Sort ascending

  config.value.xBreaks = values.length > 0 ? values : 'auto'
  updateConfig()
}

function handleDimensionsModeChange(mode: 'auto' | 'manual' | null) {
  if (!mode) return

  if (mode === 'auto') {
    config.value.width = 'auto'
    config.value.height = 'auto'
  } else {
    config.value.width = manualWidth.value
    config.value.height = manualHeight.value
  }
  updateConfig()
}

function handleManualDimensionsChange() {
  if (dimensionsMode.value === 'manual') {
    config.value.width = manualWidth.value
    config.value.height = manualHeight.value
    updateConfig()
  }
}

async function updateConfig() {
  if (!activeSession.value) return

  try {
    await sessionStore.updateSession(activeSession.value.id, {
      config: config.value
    })
  } catch (error) {
    console.error('Failed to update config:', error)
  }
}
</script>

<style scoped>
</style>
