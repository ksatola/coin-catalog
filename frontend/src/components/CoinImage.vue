<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    alt: string
    maxRetries?: number
  }>(),
  {
    maxRetries: 2,
  },
)

const currentSrc = ref(props.src)
let retryCount = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined

function clearRetryTimer(): void {
  if (retryTimer !== undefined) {
    clearTimeout(retryTimer)
    retryTimer = undefined
  }
}

function reset(): void {
  clearRetryTimer()
  retryCount = 0
  currentSrc.value = props.src
}

function retry(): void {
  if (retryCount >= props.maxRetries) return

  retryCount += 1
  clearRetryTimer()

  retryTimer = setTimeout(() => {
    retryTimer = undefined
    currentSrc.value = `${props.src}${props.src.includes('?') ? '&' : '?'}image_retry=${retryCount}`
  }, retryCount * 100)
}

watch(() => props.src, reset)

onBeforeUnmount(clearRetryTimer)
</script>

<template>
  <img :src="currentSrc" :alt="alt" @error="retry" />
</template>
