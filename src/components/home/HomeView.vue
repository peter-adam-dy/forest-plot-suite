<template>
  <v-container fluid class="home-view">
    <v-row>
      <v-col cols="12">
        <div class="text-center mb-8">
          <v-icon size="80" color="primary">mdi-chart-box-outline</v-icon>
          <h1 class="text-h3 mt-4 mb-2">Forest Plot Generator</h1>
          <p class="text-body-1 text-grey">
            Create and manage your forest plot sessions
          </p>
        </div>
      </v-col>
    </v-row>

    <SessionManager @session-selected="handleSessionSelected" />
  </v-container>
</template>

<script setup lang="ts">
import SessionManager from '@/components/session/SessionManager.vue'

const emit = defineEmits<{
  sessionSelected: [sessionId: string]
}>()

function handleSessionSelected(sessionId: string) {
  emit('sessionSelected', sessionId)
}
</script>

<style scoped>
.home-view {
  min-height: calc(100vh - 64px);
  background: rgba(var(--v-theme-surface), 1);
}
</style>
