<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { Coin, Collection } from '../types'

const route = useRoute()
const router = useRouter()
const collection = ref<Collection | null>(null)
const coins = ref<Coin[]>([])
const errorMessage = ref('')

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = -1
  do {
    value /= 1024
    unitIndex += 1
  } while (value >= 1024 && unitIndex < units.length - 1)
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

async function load(): Promise<void> {
  try {
    const id = Number(route.params.id)
    const [collectionResponse, coinsResponse] = await Promise.all([
      fetch(`/api/collections/${id}`, { cache: 'no-store' }),
      fetch(`/api/coins?collection_id=${id}`, { cache: 'no-store' }),
    ])
    if (!collectionResponse.ok || !coinsResponse.ok) throw new Error('Collection request failed')
    collection.value = await collectionResponse.json() as Collection
    coins.value = await coinsResponse.json() as Coin[]
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać kolekcji.'
  }
}

onMounted(load)
</script>

<template>
  <section class="collection-detail">
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <template v-if="collection">
      <header class="page-header">
        <div>
          <p class="eyebrow">Kolekcja</p>
          <h1>{{ collection.name }}</h1>
          <p v-if="collection.description" class="description">{{ collection.description }}</p>
        </div>
        <div class="actions">
          <button type="button" class="secondary-action" @click="router.push('/kolekcje')">Wróć do kolekcji</button>
          <button type="button" class="primary-action" @click="router.push(`/monety?collection_id=${collection.id}`)">Pokaż monety</button>
        </div>
      </header>

      <section class="stats-grid" aria-label="Statystyki kolekcji">
        <article class="stat-card"><span>Monety</span><strong>{{ collection.coin_count }}</strong><small>{{ collection.archived_coin_count }} zarchiwizowanych</small></article>
        <article class="stat-card"><span>Pliki</span><strong>{{ collection.image_count }}</strong><small>{{ formatFileSize(collection.file_size_bytes) }}</small></article>
        <article class="stat-card"><span>Kategorie</span><strong>{{ collection.category_count }}</strong><small>unikalnych użytych kategorii</small></article>
        <article class="stat-card warning-card"><span>Bez zdjęć</span><strong>{{ collection.coins_without_images_count }}</strong><small>monet bez żadnego pliku</small></article>
      </section>

      <p class="last-modified">Ostatnia zmiana: <strong>{{ formatDate(collection.last_modified_at) }}</strong></p>

      <section class="coins-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Zawartość</p>
            <h2>Monety w kolekcji</h2>
          </div>
        </div>

        <div v-if="coins.length" class="coin-list">
          <RouterLink v-for="coin in coins" :key="coin.id" class="coin-item" :to="`/monety/${coin.id}`">
            <strong>#{{ coin.id }}<span v-if="coin.collection_number"> · {{ coin.collection_number }}</span></strong>
            <span>{{ coin.from_year }}–{{ coin.to_year }}</span>
          </RouterLink>
        </div>
        <p v-else class="empty-state">Ta kolekcja nie zawiera jeszcze monet.</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.collection-detail { display: grid; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.eyebrow { margin: 0 0 4px; color: #64748b; font-size: .75rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
h1, h2 { margin: 0; color: #0f172a; }
h1 { font-size: clamp(28px, 4vw, 38px); }
h2 { font-size: 20px; }
.description, .last-modified { margin: 8px 0 0; color: #64748b; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.primary-action, .secondary-action { min-height: 40px; padding: 8px 13px; border-radius: 7px; font-weight: 700; }
.primary-action { border: 1px solid #2563eb; background: #2563eb; color: #fff; }
.secondary-action { border: 1px solid #cbd5e1; background: #fff; color: #334155; }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.stat-card { display: grid; gap: 4px; min-height: 112px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; box-shadow: 0 2px 8px rgba(15,23,42,.05); }
.stat-card span { color: #64748b; font-size: .78rem; font-weight: 700; text-transform: uppercase; }
.stat-card strong { color: #0f172a; font-size: 1.45rem; }
.stat-card small { color: #64748b; font-size: .78rem; }
.warning-card strong { color: #92400e; }
.coins-section { padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; box-shadow: 0 2px 8px rgba(15,23,42,.05); }
.section-heading { margin-bottom: 16px; }
.coin-list { display: grid; gap: 8px; }
.coin-item { display: flex; justify-content: space-between; gap: 16px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 8px; color: #334155; text-decoration: none; }
.coin-item:hover { background: #f8fafc; }
.coin-item strong { color: #0f172a; }
.empty-state { margin: 0; padding: 24px; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; text-align: center; }
.error { margin: 0; padding: 12px 14px; border: 1px solid #fecaca; border-radius: 8px; background: #fef2f2; color: #991b1b; }
@media (max-width: 800px) { .page-header { flex-direction: column; } .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .stats-grid { grid-template-columns: 1fr; } .actions, .actions button { width: 100%; } .coin-item { align-items: flex-start; flex-direction: column; gap: 4px; } }
</style>
