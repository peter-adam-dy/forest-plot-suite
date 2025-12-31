<template>
  <v-container fluid>
    <v-row v-if="!activeSession">
      <v-col>
        <v-alert type="info" variant="tonal">
          Please create or select a session to configure plot settings.
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col cols="12" md="6">
        <v-card>
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

            <v-select
              v-model="config.effectMeasure"
              :items="effectMeasureOptions"
              label="Effect Measure"
              variant="outlined"
              density="compact"
              @update:model-value="updateConfig"
            ></v-select>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
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
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Visual Style</v-card-title>
          <v-card-text>
            <v-select
              v-model="config.layoutStyle"
              :items="layoutStyleOptions"
              label="Plot Layout"
              variant="outlined"
              density="compact"
              class="mb-3"
              @update:model-value="updateConfig"
            ></v-select>

            <v-alert
              v-if="config.layoutStyle === 'modern' && config.showWeights"
              type="info"
              variant="tonal"
              density="compact"
              class="mb-3"
            >
              Study weights are not displayed in modern layout
            </v-alert>

            <v-alert
              v-if="config.layoutStyle === 'modern' && config.showMetadata"
              type="info"
              variant="tonal"
              density="compact"
              class="mb-3"
            >
              Heterogeneity statistics are not displayed in modern layout
            </v-alert>

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
              v-model="config.showWeights"
              label="Show study weights"
              density="compact"
              @update:model-value="updateConfig"
            ></v-checkbox>

            <v-checkbox
              v-model="config.showValues"
              label="Show effect values and CIs"
              density="compact"
              @update:model-value="updateConfig"
            ></v-checkbox>

            <v-checkbox
              v-model="config.showMetadata"
              label="Show heterogeneity and test statistics"
              density="compact"
              @update:model-value="updateConfig"
            ></v-checkbox>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
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
      </v-col>

      <v-col cols="12">
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
                  <td>Layout Style</td>
                  <td>{{ config.layoutStyle === 'classic' ? 'Classic' : 'Modern' }}</td>
                </tr>
                <tr>
                  <td>Effect Measure</td>
                  <td>{{ config.effectMeasure }}</td>
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
                  <td>Point Size</td>
                  <td>{{ config.pointSize }}</td>
                </tr>
                <tr>
                  <td>Color Scheme</td>
                  <td>{{ config.colorScheme }}</td>
                </tr>
                <tr>
                  <td>Show Weights</td>
                  <td>{{ config.showWeights ? 'Yes' : 'No' }}</td>
                </tr>
                <tr>
                  <td>Show Values</td>
                  <td>{{ config.showValues ? 'Yes' : 'No' }}</td>
                </tr>
                <tr>
                  <td>Show Metadata</td>
                  <td>{{ config.showMetadata ? 'Yes' : 'No' }}</td>
                </tr>
                <tr>
                  <td>DPI</td>
                  <td>{{ config.dpi }}</td>
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
import { ref, computed, watch } from 'vue'
import { useSessionStore } from '@/stores/session'
import type { PlotConfig, AxisType, LayoutStyle } from '@/types'

const sessionStore = useSessionStore()
const activeSession = computed(() => sessionStore.activeSession)

// Local config state
const config = ref<PlotConfig>({
  layoutStyle: 'classic',
  axisType: 'linear',
  xLimits: 'auto',
  title: 'Forest Plot',
  subtitle: '',
  xLabel: 'Effect Size',
  yLabel: 'Study',
  dpi: 300,
  effectMeasure: 'RR',
  pointSize: 3,
  colorScheme: 'default',
  showWeights: true,
  showValues: true,
  showMetadata: false,
  width: 'auto',
  height: 'auto',
})

// Limits mode handling
const limitsMode = ref<'auto' | 'manual'>('auto')
const manualLimits = ref<[number, number]>([0, 1])

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

const layoutStyleOptions = [
  { title: 'Classic (meta::forest)', value: 'classic' },
  { title: 'Modern (ggplot2)', value: 'modern' },
]

const effectMeasureOptions = [
  { title: 'Risk Ratio (RR)', value: 'RR' },
  { title: 'Odds Ratio (OR)', value: 'OR' },
  { title: 'Hazard Ratio (HR)', value: 'HR' },
  { title: 'Mean Difference (MD)', value: 'MD' },
  { title: 'Standardized Mean Difference (SMD)', value: 'SMD' },
]

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
    config.value = { ...session.config }

    // Set limits mode based on config
    if (session.config.xLimits === 'auto') {
      limitsMode.value = 'auto'
    } else {
      limitsMode.value = 'manual'
      manualLimits.value = [...session.config.xLimits]
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
