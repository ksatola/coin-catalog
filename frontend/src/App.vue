<script setup lang="ts">
import { onMounted, ref } from 'vue'

const backendStatus = ref('Checking backend...')

onMounted(async () => {
  try {
    const response = await fetch('/api/health')

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data: { status: string } = await response.json()
    backendStatus.value = data.status
  } catch {
    backendStatus.value = 'Backend unavailable'
  }
})
</script>

<template>
  <h1>Coin Catalog</h1>
  <p>Backend status: {{ backendStatus }}</p>
</template>