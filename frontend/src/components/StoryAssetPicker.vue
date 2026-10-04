<script setup lang="ts">
import { ref } from 'vue'
import CoinImageDropZone from './CoinImageDropZone.vue'
import type { StoryAsset } from '../types'

const emit = defineEmits<{ select: [asset: StoryAsset]; close: [] }>()
const assets = ref<StoryAsset[]>([])
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const altText = ref('')

async function loadAssets(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/story/assets', { cache: 'no-store' })
    if (!response.ok) throw new Error()
    assets.value = await response.json() as StoryAsset[]
  } catch {
    error.value = 'Nie udało się pobrać assetów.'
  } finally {
    loading.value = false
  }
}

async function uploadAsset(files: File[]): Promise<void> {
  const file = files[0]
  if (!file) return
  uploading.value = true
  error.value = ''
  try {
    const formData = new FormData()
    formData.append('upload', file)
    formData.append('alt_text', altText.value)
    const response = await fetch('/api/story/assets', { method: 'POST', body: formData })
    if (!response.ok) throw new Error()
    const asset = await response.json() as StoryAsset
    assets.value = [...assets.value, asset]
    altText.value = ''
    emit('select', asset)
  } catch {
    error.value = 'Nie udało się wgrać assetu.'
  } finally {
    uploading.value = false
  }
}

function selectAsset(id: number): void {
  const asset = assets.value.find((item) => item.id === id)
  if (asset) emit('select', asset)
}

void loadAssets()
</script>

<template>
  <div class="asset-picker-backdrop" @click.self="emit('close')">
    <section class="asset-picker" role="dialog" aria-modal="true" aria-label="Wybierz asset">
      <header>
        <h2>Wstaw obraz</h2>
        <button type="button" @click="emit('close')">Zamknij</button>
      </header>
      <label>
        Tekst alternatywny
        <input v-model="altText" aria-label="Tekst alternatywny" />
      </label>
      <CoinImageDropZone title="Dodaj obraz" @files="uploadAsset" />
      <p v-if="uploading">Wgrywanie…</p>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="loading">Ładowanie…</p>
      <div class="asset-list">
        <button v-for="asset in assets" :key="asset.id" type="button" class="asset" :disabled="uploading" @click="selectAsset(asset.id)">
          <img :src="`/api/story/assets/${asset.id}/thumbnail`" :alt="asset.alt_text || asset.original_filename" />
          <span>#{{ asset.id }} — {{ asset.original_filename }}</span>
          <small>{{ asset.width }} × {{ asset.height }}</small>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.asset-picker-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);display:grid;place-items:center;padding:20px;z-index:20}.asset-picker{width:min(760px,100%);max-height:90vh;overflow:auto;background:white;border-radius:10px;padding:18px;display:grid;gap:14px}.asset-picker header{display:flex;justify-content:space-between;align-items:center}.asset-picker header button{background:white;color:#334155;border:1px solid #cbd5e1}.asset-picker label{display:grid;gap:6px;font-weight:600}.asset-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}.asset{display:grid;gap:6px;padding:8px;background:white;color:#1f2937;border:1px solid #dbe3ee;border-radius:8px;text-align:left}.asset img{width:100%;height:110px;object-fit:contain;background:#f8fafc}.asset small{color:#64748b}.error{color:#b91c1c}
</style>
