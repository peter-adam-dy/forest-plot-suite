<template>
  <v-app>
    <v-app-bar app color="primary" density="compact">
      <!-- Back button (only in session view) -->
      <v-btn
        v-if="currentView === 'session'"
        icon
        @click="navigateToHome"
      >
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <!-- Title -->
      <v-toolbar-title v-if="currentView === 'home'">
        Forest Plot Generator
      </v-toolbar-title>
      <v-toolbar-title v-else-if="activeSession">
        {{ activeSession.name }}
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <!-- Session actions menu (only in session view) -->
      <v-menu v-if="currentView === 'session' && activeSession">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="showRenameDialog">
            <v-list-item-title>
              <v-icon start size="small">mdi-pencil</v-icon>
              Rename Session
            </v-list-item-title>
          </v-list-item>
          <v-list-item @click="exportCurrentSession">
            <v-list-item-title>
              <v-icon start size="small">mdi-export</v-icon>
              Export Session
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main>
      <!-- Loading State -->
      <div v-if="!initialized" class="d-flex justify-center align-center" style="min-height: 400px">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <!-- Home View -->
      <HomeView
        v-else-if="currentView === 'home'"
        @session-selected="navigateToSession"
      />

      <!-- Session View -->
      <div v-else-if="currentView === 'session' && activeSession" class="session-view">
        <Splitpanes class="session-layout" @resize="handleResize">
          <!-- Left Panel (60% default) -->
          <Pane :size="60" :min-size="30" :max-size="70">
            <div class="panel-content">
              <v-tabs v-model="currentTab" bg-color="transparent" color="primary">
                <v-tab value="data">
                  <v-icon start>mdi-table</v-icon>
                  Data
                </v-tab>
                <v-tab value="config">
                  <v-icon start>mdi-cog</v-icon>
                  Configuration
                </v-tab>
                <v-tab value="code">
                  <v-icon start>mdi-code-braces</v-icon>
                  R Code
                </v-tab>
              </v-tabs>

              <v-divider class="mb-4"></v-divider>

              <div class="tab-content">
                <v-window v-model="currentTab">
                  <v-window-item value="data">
                    <DataEditor />
                  </v-window-item>

                  <v-window-item value="config">
                    <PlotConfig />
                  </v-window-item>

                  <v-window-item value="code">
                    <CodeViewer />
                  </v-window-item>
                </v-window>
              </div>
            </div>
          </Pane>

          <!-- Right Panel (40% default) -->
          <Pane :size="40" :min-size="30">
            <div class="panel-content">
              <div class="plot-header">
                <v-icon start>mdi-chart-box</v-icon>
                <span class="text-h6">Plot</span>
              </div>
              <v-divider class="mb-4"></v-divider>
              <PlotViewer />
            </div>
          </Pane>
        </Splitpanes>
      </div>

      <!-- Fallback: No session -->
      <div v-else class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1">mdi-chart-box-outline</v-icon>
        <h2 class="text-h5 mt-4 mb-2">No Session Selected</h2>
        <v-btn color="primary" @click="navigateToHome">
          Go to Sessions
        </v-btn>
      </div>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

import HomeView from '@/components/home/HomeView.vue'
import DataEditor from '@/components/data/DataEditor.vue'
import PlotConfig from '@/components/plot/PlotConfig.vue'
import PlotViewer from '@/components/plot/PlotViewer.vue'
import CodeViewer from '@/components/plot/CodeViewer.vue'

const currentView = ref<'home' | 'session'>('home')
const currentTab = ref('data')

const sessionStore = useSessionStore()
const initialized = computed(() => sessionStore.initialized)
const activeSession = computed(() => sessionStore.activeSession)

// Navigation functions
function navigateToHome() {
  currentView.value = 'home'
  sessionStore.setActiveSession(null)
}

function navigateToSession(sessionId: string) {
  sessionStore.setActiveSession(sessionId)
  currentView.value = 'session'
}

// Session actions
function showRenameDialog() {
  // TODO: Implement rename dialog
  console.log('Rename session')
}

async function exportCurrentSession() {
  if (!activeSession.value) return

  try {
    const jsonData = await sessionStore.exportSession(activeSession.value.id)
    downloadJson(jsonData, `${activeSession.value.name}.json`)
  } catch (error) {
    console.error('Failed to export session:', error)
  }
}

function downloadJson(jsonData: string, filename: string) {
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Splitpanes resize handler
function handleResize(event: any) {
  // Optional: Store resize state in localStorage
  console.log('Panel resized:', event)
}

onMounted(async () => {
  try {
    await sessionStore.initialize()
    // Start on home view
    currentView.value = 'home'
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }
})
</script>

<style scoped>
.session-view {
  height: calc(100vh - 64px);
}

.session-layout {
  height: 100%;
}

.panel-content {
  height: 100%;
  overflow-y: auto;
  padding: 16px 24px;
}

.tab-content {
  overflow-y: auto;
  max-height: calc(100vh - 180px);
}

.plot-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
}
</style>

<style>
/* Global styles for splitpanes */
.splitpanes__splitter {
  background-color: rgba(var(--v-border-color), var(--v-border-opacity));
  position: relative;
}

.splitpanes__splitter:before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  transition: opacity 0.4s;
  background-color: rgba(var(--v-theme-primary), 0.3);
  opacity: 0;
  z-index: 1;
}

.splitpanes__splitter:hover:before {
  opacity: 1;
}

.splitpanes--vertical > .splitpanes__splitter:before {
  left: -2px;
  right: -2px;
  height: 100%;
  width: 5px;
}

.splitpanes--horizontal > .splitpanes__splitter:before {
  top: -2px;
  bottom: -2px;
  height: 5px;
  width: 100%;
}
</style>
