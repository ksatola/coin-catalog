<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import CoinFilters from '../components/CoinFilters.vue'
import CoinGrid from '../components/CoinGrid.vue'
import CoinImageGrid from '../components/CoinImageGrid.vue'
import CoinList from '../components/CoinList.vue'
import { buildCoinFilterQuery, resetCoinFilters, useCoinFilters } from '../composables/useCoinFilters'
import type { Coin } from '../types'

type CatalogScope = 'coins' | 'archive'
type ViewMode = 'image-grid' | 'grid' | 'list'

const props = defineProps<{
  scope: CatalogScope
}>()

const router = useRouter()
const filters = useCoinFilters(props.scope)
const coins = ref<Coin[]>([])
const errorMessage = ref('')
const showAdvancedFilters = ref(false)

const isArchive = props.scope === 'archive'
const pageTitle = isArchive ? 'Archiwum' : 'Monety'
const pageSubtitle = isArchive ? 'Zarchiwizowane monety' : 'Katalog kolekcji'
const emptyTitle = isArchive ? 'Brak zarchiwizowanych monet' : 'Brak monet'
const emptyDescription = isArchive
  ? 'Nie znaleziono monet spełniających kryteria archiwum.'
  : 'Nie znaleziono monet spełniających kryteria.'
const viewModeStorageKey = `coin-catalog:view-mode:${props.scope}`

function loadViewMode(): ViewMode {
  const stored = localStorage.getItem(viewModeStorageKey)
  return stored === 'image-grid' || stored === 'grid' || stored === 'list'
    ? stored
    : 'image-grid'
}

const viewMode = ref<ViewMode>(loadViewMode())

watch(viewMode, (mode) => {
  localStorage.setItem(viewModeStorageKey, mode)
})

async function loadCoins(): Promise<void> {
  try {
    const query = buildCoinFilterQuery(filters)
    const response = await fetch(`/api/coins${query ? `?${query}` : ''}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    coins.value = await response.json() as Coin[]
    errorMessage.value = ''
  } catch {
    errorMessage.value = isArchive
      ? 'Nie udało się pobrać archiwum.'
      : 'Nie udało się pobrać monet.'
  }
}

async function archiveCoin(coin: Coin): Promise<void> {
  if (isArchive) return

  try {
    const response = await fetch(`/api/coins/${coin.id}/archive`, { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await loadCoins()
  } catch {
    errorMessage.value = 'Nie udało się zarchiwizować monety.'
  }
}

async function restoreCoin(coin: Coin): Promise<void> {
  if (!isArchive) return

  try {
    const response = await fetch(`/api/coins/${coin.id}/restore`, { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await loadCoins()
  } catch {
    errorMessage.value = 'Nie udało się przywrócić monety.'
  }
}

function resetFilters(): void {
  resetCoinFilters(filters, isArchive ? 'archived' : 'active')
  void loadCoins()
}

function toggleAdvancedFilters(): void {
  showAdvancedFilters.value = !showAdvancedFilters.value
}

onMounted(loadCoins)
</script>

<template>
  <section class="coins-view">
    <header class="page-header">
      <div>
        <h1>{{ pageTitle }}</h1>
        <p class="page-subtitle">{{ pageSubtitle }}</p>
      </div>

      <div class="view-switcher" aria-label="Sposób wyświetlania monet">
        <button type="button" :class="{ active: viewMode === 'image-grid' }" :disabled="viewMode === 'image-grid'" @click="viewMode = 'image-grid'">
          ▦ Galeria
        </button>
        <button type="button" :class="{ active: viewMode === 'grid' }" :disabled="viewMode === 'grid'" @click="viewMode = 'grid'">
          ▦ Grid
        </button>
        <button type="button" :class="{ active: viewMode === 'list' }" :disabled="viewMode === 'list'" @click="viewMode = 'list'">
          ☷ Lista
        </button>
      </div>
    </header>

    <form class="simple-search" @submit.prevent="loadCoins">
      <div class="search-field">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input
          v-model="filters.search"
          type="search"
          placeholder="Szukaj monet, np. polska grosz"
          aria-label="Szukaj monet"
        />
      </div>
      <button
        class="filters-toggle"
        type="button"
        :aria-expanded="showAdvancedFilters"
        aria-controls="advanced-coin-filters"
        @click="toggleAdvancedFilters"
      >
        ⚙ Filtry
      </button>
    </form>

    <div v-if="showAdvancedFilters" id="advanced-coin-filters" class="advanced-filters">
      <div class="advanced-filters-header">
        <div>
          <h2>Filtry</h2>
          <p>Uściślij wyszukiwanie według cech monety.</p>
        </div>
        <button type="button" class="collapse-button" @click="toggleAdvancedFilters">Zwiń</button>
      </div>

      <CoinFilters :filters="filters" show-status @submit="loadCoins" />
      <button class="reset-button" type="button" @click="resetFilters">Wyczyść filtry</button>
    </div>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <div v-if="coins.length === 0" class="empty-state">
      <strong>{{ emptyTitle }}</strong>
      <span>{{ emptyDescription }}</span>
    </div>

    <template v-else>
      <div class="results-bar">
        <strong>{{ coins.length }} {{ coins.length === 1 ? 'moneta' : coins.length < 5 ? 'monety' : 'monet' }}</strong>
      </div>

      <CoinImageGrid v-if="viewMode === 'image-grid'" :coins="coins" />
      <CoinGrid v-else-if="viewMode === 'grid'" :coins="coins" />

      <CoinList
        v-else
        :coins="coins"
        @details="(coin) => router.push(`/monety/${coin.id}`)"
        @archive="archiveCoin"
        @restore="restoreCoin"
      />
    </template>
  </section>
</template>

<style scoped>
.coins-view {
  display: grid;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
}

.page-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(28px, 4vw, 38px);
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.view-switcher {
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #ffffff;
}

.view-switcher button {
  min-height: 34px;
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.view-switcher button.active {
  background: #e2e8f0;
  color: #0f172a;
}

.simple-search {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.search-field {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 10px;
  min-width: 0;
  height: 48px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.search-field:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-icon {
  color: #64748b;
  font-size: 21px;
  line-height: 1;
}

.search-field input {
  width: 100%;
  min-width: 0;
  height: 48px;
  padding: 0;
  border: 0;
  outline: 0;
  box-shadow: none;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.4;
}

.filters-toggle,
.collapse-button {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: #ffffff;
  color: #334155;
  font-weight: 700;
}

.filters-toggle:hover,
.collapse-button:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.advanced-filters {
  padding: 20px;
  border: 1px solid #dbe3ee;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.advanced-filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.advanced-filters-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

.advanced-filters-header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}

.advanced-filters :deep(.coin-filters) {
  margin: 20px 0 12px;
  padding: 0;
  border: 0;
  box-shadow: none;
}

.reset-button {
  min-height: 36px;
  padding: 7px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.reset-button:hover {
  background: #f8fafc;
}

.results-bar {
  color: #475569;
  font-size: 14px;
}

.error-message {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 14px;
  font-weight: 600;
}

.empty-state {
  display: grid;
  gap: 6px;
  padding: 48px 24px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  color: #64748b;
  text-align: center;
}

.empty-state strong {
  color: #334155;
  font-size: 18px;
}

@media (max-width: 600px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .view-switcher {
    align-self: stretch;
  }

  .view-switcher button {
    flex: 1;
  }

  .simple-search {
    flex-direction: column;
  }

  .filters-toggle {
    width: 100%;
  }

  .advanced-filters {
    padding: 16px;
  }
}
</style>
