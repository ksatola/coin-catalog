<script setup lang="ts">
import type { StoryAsset } from '../types'
defineProps<{ id: number; asset: StoryAsset | null }>()
</script>

<template>
  <span v-if="asset" class="story-asset">
    <img :src="`/api/story/assets/${asset.id}/file`" :alt="asset.alt_text || asset.original_filename" loading="lazy" />
  </span>
  <span v-else class="story-asset-placeholder">Obraz #{{ id }} — brak danych</span>
</template>

<style scoped>
.story-asset{display:inline-block;max-width:100%;vertical-align:middle}.story-asset img{display:block;max-width:100%;height:auto}.story-asset-placeholder{display:inline-block;padding:4px 8px;border:1px dashed #94a3b8;border-radius:6px;background:#f8fafc;color:#334155;font-weight:600}
</style>
