<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" app width="320">
      <SessionManager />
    </v-navigation-drawer>

    <v-app-bar app color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>Forest Plot Generator</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-chip v-if="activeSession" class="mr-2">
        {{ activeSession.name }}
      </v-chip>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <div v-if="!initialized" class="d-flex justify-center align-center" style="min-height: 400px">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </div>

        <div v-else-if="!activeSession" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-chart-box-outline</v-icon>
          <h2 class="text-h5 mt-4 mb-2">No Session Selected</h2>
          <p class="text-body-1 text-grey">
            Create a new session or select an existing one from the sidebar
          </p>
        </div>

        <div v-else>
          <v-tabs v-model="currentTab" bg-color="transparent" color="primary">
            <v-tab value="data">
              <v-icon start>mdi-table</v-icon>
              Data
            </v-tab>
            <v-tab value="config">
              <v-icon start>mdi-cog</v-icon>
              Configuration
            </v-tab>
            <v-tab value="plot">
              <v-icon start>mdi-chart-box</v-icon>
              Plot
            </v-tab>
            <v-tab value="code">
              <v-icon start>mdi-code-braces</v-icon>
              R Code
            </v-tab>
          </v-tabs>

          <v-divider class="mb-4"></v-divider>

          <v-window v-model="currentTab">
            <v-window-item value="data">
              <DataEditor />
            </v-window-item>

            <v-window-item value="config">
              <PlotConfig />
            </v-window-item>

            <v-window-item value="plot">
              <PlotViewer />
            </v-window-item>

            <v-window-item value="code">
              <CodeViewer />
            </v-window-item>
          </v-window>
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import SessionManager from '@/components/session/SessionManager.vue'
import DataEditor from '@/components/data/DataEditor.vue'
import PlotConfig from '@/components/plot/PlotConfig.vue'
import PlotViewer from '@/components/plot/PlotViewer.vue'
import CodeViewer from '@/components/plot/CodeViewer.vue'

const drawer = ref(true)
const currentTab = ref('data')

const sessionStore = useSessionStore()
const initialized = computed(() => sessionStore.initialized)
const activeSession = computed(() => sessionStore.activeSession)

onMounted(async () => {
  try {
    await sessionStore.initialize()
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }
})
</script>

<style scoped>
</style>
