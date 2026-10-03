<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useStoryCoinSelection } from '../composables/useStoryCoinSelection'
import type { Coin, CoinPageResponse } from '../types'

const emit = defineEmits<{ select: [id: number]; close: [] }>()
const selection = useStoryCoinSelection()
const mode = ref<'catalog' | 'selected'>('catalog')
const search = ref('')
const coins = ref<Coin[]>([])
const loading = ref(false)
const error = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

async function loadCatalog(): Promise<void> {
  const value = search.value.trim()
  if (value && value.split(/\s+/).some((token) => token.length < 3)) {
    coins.value = []
    error.value = 'Każdy fragment wyszukiwania musi mieć co najmniej 3 znaki.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ limit: '50', status: 'active', sort_by: 'id', sort_order: 'asc' })
    if (value) params.set('search', value)
    const response = await fetch('/api/coins?' + params.toString(), { cache: 'no-store' })
    if (!response.ok) throw new Error()
    const payload = await response.json() as CoinPageResponse | Coin[]
    coins.value = Array.isArray(payload) ? payload : payload.items
  } catch { error.value = 'Nie udało się pobrać monet.' }
  finally { loading.value = false }
}

async function loadSelected(): Promise<void> {
  const result: Coin[] = []
  for (const id of selection.ids.value) {
    try {
      const response = await fetch('/api/coins/' + id, { cache: 'no-store' })
      if (response.ok) result.push(await response.json() as Coin)
    } catch {}
  }
  coins.value = result
}

function switchMode(next: 'catalog' | 'selected'): void {
  mode.value = next
  if (next === 'catalog') void loadCatalog()
  else void loadSelected()
}
watch(search, () => {
  if (timer !== undefined) clearTimeout(timer)
  timer = setTimeout(() => void loadCatalog(), 250)
})
onMounted(() => void loadCatalog())
</script>

<template>
  <div class="picker-backdrop" role="presentation" @click.self="emit('close')">
    <section class="picker" role="dialog" aria-modal="true" aria-labelledby="story-coin-picker-title">
      <header class="picker-header"><div><h2 id="story-coin-picker-title">Wstaw monetę</h2><p>Wybierz monetę, aby wstawić referencję do Markdown.</p></div><button type="button" class="close-button" aria-label="Zamknij" @click="emit('close')">×</button></header>
      <div class="mode-tabs" role="tablist" aria-label="Źródło monet">
        <button type="button" :aria-selected="mode === 'catalog'" @click="switchMode('catalog')">Katalog</button>
        <button type="button" :aria-selected="mode === 'selected'" @click="switchMode('selected')">Wybrane w widoku Monety ({{ selection.ids.value.length }})</button>
      </div>
      <label v-if="mode === 'catalog'" class="search">Szukaj<input v-model="search" type="search" placeholder="np. polska grosz" /></label>
      <p v-if="error" class="error">{{ error }}</p><p v-else-if="loading" class="status">Ładowanie…</p><div v-else-if="coins.length === 0" class="status">Brak monet.</div>
      <ul v-else class="coin-results"><li v-for="coin in coins" :key="coin.id"><span><strong>#{{ coin.id }}</strong><span v-if="coin.collection_number"> · {{ coin.collection_number }}</span></span><button type="button" @click="emit('select', coin.id)">Wstaw</button></li></ul>
    </section>
  </div>
</template>

<style scoped>
.picker-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.45)}
.picker{display:grid;gap:16px;width:min(680px,100%);max-height:min(720px,90vh);overflow:auto;padding:20px;border:1px solid #dbe3ee;border-radius:12px;background:#fff;box-shadow:0 20px 50px rgba(15,23,42,.2)}
.picker-header{display:flex;justify-content:space-between;gap:16px}.picker-header h2{margin:0;color:#0f172a}.picker-header p{margin:5px 0 0;color:#64748b;font-size:13px}.close-button{width:36px;height:36px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font-size:22px}
.mode-tabs{display:flex;gap:6px}.mode-tabs button{padding:9px 12px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#334155}.mode-tabs button[aria-selected=true]{background:#e2e8f0;font-weight:700}
.search{display:grid;gap:6px;color:#475569;font-size:13px;font-weight:600}.search input{padding:9px 10px;border:1px solid #cbd5e1;border-radius:7px}
.coin-results{display:grid;gap:7px;margin:0;padding:0;list-style:none}.coin-results li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid #e2e8f0;border-radius:7px}.coin-results button{padding:7px 11px;border:0;border-radius:6px;background:#2563eb;color:#fff;font-weight:700}.status{margin:0;color:#64748b}.error{margin:0;color:#b91c1c;font-weight:600}
</style>
