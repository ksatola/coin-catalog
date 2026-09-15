<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import CoinGrid from '../components/CoinGrid.vue'
import CoinList from '../components/CoinList.vue'
import type { Category, CategoryGraphItem, Coin } from '../types'

const router = useRouter()
const coins = ref<Coin[]>([])
const errorMessage = ref('')
const filterErrorMessage = ref('')
const viewMode = ref<'grid' | 'list'>('grid')

const search = ref('')
const dictionarySelections = reactive({
  countries: [] as number[],
  issuers: [] as number[],
  denominations: [] as number[],
  mints: [] as number[],
  materials: [] as number[],
  states: [] as number[],
  eras: [] as number[],
})
const categoryIds = ref<number[]>([])
const includeCategoryChildren = ref(true)
const fromYear = ref<number | null>(null)
const toYear = ref<number | null>(null)
const hasImage = ref('')
const hasVideo = ref('')
const statusFilter = ref('active')
const sortBy = ref('id')
const sortOrder = ref('asc')

const dictionaries = ref<Record<string, Array<{ id: number; name: string }>>>({
  countries: [],
  issuers: [],
  denominations: [],
  mints: [],
  materials: [],
  states: [],
  eras: [],
})
const categories = ref<Category[]>([])

const dictionaryLabels: Record<string, string> = {
  countries: 'Kraj',
  issuers: 'Emitent',
  denominations: 'Nominał',
  mints: 'Mennica',
  materials: 'Materiał',
  states: 'Stan',
  eras: 'Era',
}

function validateSearch(): boolean {
  const tokens = search.value.trim().split(/\s+/).filter(Boolean)
  if (tokens.some((token) => token.length < 3)) {
    filterErrorMessage.value = 'Każdy fragment wyszukiwania musi mieć co najmniej 3 znaki.'
    return false
  }
  filterErrorMessage.value = ''
  return true
}

function appendIds(params: URLSearchParams, name: string, ids: number[]): void {
  for (const id of ids) params.append(name, String(id))
}

function buildQuery(): string {
  const params = new URLSearchParams()
  if (search.value.trim()) params.set('search', search.value.trim())

  appendIds(params, 'country_id', dictionarySelections.countries)
  appendIds(params, 'issuer_id', dictionarySelections.issuers)
  appendIds(params, 'denomination_id', dictionarySelections.denominations)
  appendIds(params, 'mint_id', dictionarySelections.mints)
  appendIds(params, 'material_id', dictionarySelections.materials)
  appendIds(params, 'state_id', dictionarySelections.states)
  appendIds(params, 'era_id', dictionarySelections.eras)
  appendIds(params, 'category_id', categoryIds.value)

  params.set('include_category_children', String(includeCategoryChildren.value))
  if (fromYear.value !== null) params.set('from_year', String(fromYear.value))
  if (toYear.value !== null) params.set('to_year', String(toYear.value))
  if (hasImage.value) params.set('has_image', hasImage.value)
  if (hasVideo.value) params.set('has_video', hasVideo.value)
  params.set('status', statusFilter.value)
  params.set('sort_by', sortBy.value)
  params.set('sort_order', sortOrder.value)
  return params.toString()
}

async function loadCoins(): Promise<void> {
  if (!validateSearch()) return

  try {
    const query = buildQuery()
    const response = await fetch(`/api/coins${query ? `?${query}` : ''}`, {
      cache: 'no-store',
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    coins.value = await response.json() as Coin[]
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać monet.'
  }
}

async function loadFilters(): Promise<void> {
  try {
    const names = Object.keys(dictionaries.value)
    const [dictionaryResults, categoryResponse] = await Promise.all([
      Promise.all(
        names.map(async (name) => {
          const response = await fetch(`/api/dictionaries/${name}`)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return [name, await response.json() as Array<{ id: number; name: string }>] as const
        }),
      ),
      fetch('/api/categories'),
    ])

    if (!categoryResponse.ok) throw new Error(`HTTP ${categoryResponse.status}`)

    for (const [name, items] of dictionaryResults) dictionaries.value[name] = items
    categories.value = await categoryResponse.json() as CategoryGraphItem[]
  } catch {
    filterErrorMessage.value = 'Nie udało się pobrać danych filtrów.'
  }
}

async function archiveCoin(coin: Coin): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${coin.id}/archive`, { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await loadCoins()
  } catch {
    errorMessage.value = 'Nie udało się zarchiwizować monety.'
  }
}

async function restoreCoin(coin: Coin): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${coin.id}/restore`, { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await loadCoins()
  } catch {
    errorMessage.value = 'Nie udało się przywrócić monety.'
  }
}

function resetFilters(): void {
  search.value = ''
  for (const name of Object.keys(dictionarySelections)) dictionarySelections[name as keyof typeof dictionarySelections] = []
  categoryIds.value = []
  includeCategoryChildren.value = true
  fromYear.value = null
  toYear.value = null
  hasImage.value = ''
  hasVideo.value = ''
  statusFilter.value = 'active'
  sortBy.value = 'id'
  sortOrder.value = 'asc'
  void loadCoins()
}

onMounted(async () => {
  await loadFilters()
  await loadCoins()
})
</script>

<template>
  <section>
    <header>
      <h1>Monety</h1>

      <div>
        <button type="button" :disabled="viewMode === 'grid'" @click="viewMode = 'grid'">
          ▦ Grid
        </button>
        <button type="button" :disabled="viewMode === 'list'" @click="viewMode = 'list'">
          ☷ Lista
        </button>
      </div>
    </header>

    <form class="coin-filters" @submit.prevent="loadCoins">
      <label>
        Szukaj
        <input v-model="search" type="search" placeholder="np. polska grosz" />
      </label>

      <div class="filter-grid">
        <label v-for="(items, name) in dictionaries" :key="name">
          {{ dictionaryLabels[name] }}
          <select v-model="dictionarySelections[name as keyof typeof dictionarySelections]" multiple size="4">
            <option v-for="item in items" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>

        <label>
          Kategorie
          <select v-model="categoryIds" multiple size="4">
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>
      </div>

      <label>
        <input v-model="includeCategoryChildren" type="checkbox" />
        Uwzględniaj podkategorie
      </label>

      <div class="range-filter">
        <label>Rok od <input v-model.number="fromYear" type="number" /></label>
        <label>Rok do <input v-model.number="toYear" type="number" /></label>
      </div>

      <div class="filter-row">
        <label>
          Zdjęcie
          <select v-model="hasImage">
            <option value="">Dowolne</option>
            <option value="true">Ma zdjęcie</option>
            <option value="false">Brak zdjęcia</option>
          </select>
        </label>
        <label>
          Wideo
          <select v-model="hasVideo">
            <option value="">Dowolne</option>
            <option value="true">Ma wideo</option>
            <option value="false">Brak wideo</option>
          </select>
        </label>
        <label>
          Status
          <select v-model="statusFilter">
            <option value="active">Aktywne</option>
            <option value="archived">Archiwalne</option>
            <option value="all">Wszystkie</option>
          </select>
        </label>
        <label>
          Sortuj po
          <select v-model="sortBy">
            <option value="id">ID</option>
            <option value="from_year">Rok od</option>
            <option value="to_year">Rok do</option>
          </select>
        </label>
        <label>
          Kierunek
          <select v-model="sortOrder">
            <option value="asc">Rosnąco</option>
            <option value="desc">Malejąco</option>
          </select>
        </label>
      </div>

      <div>
        <button type="submit">Szukaj / filtruj</button>
        <button type="button" @click="resetFilters">Wyczyść</button>
      </div>
    </form>

    <p v-if="filterErrorMessage">{{ filterErrorMessage }}</p>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <p v-if="coins.length === 0">Brak monet spełniających kryteria.</p>

    <CoinGrid v-else-if="viewMode === 'grid'" :coins="coins" />

    <CoinList
      v-else
      :coins="coins"
      @details="(coin) => router.push(`/monety/${coin.id}`)"
      @archive="archiveCoin"
      @restore="restoreCoin"
    />
  </section>
</template>

<style scoped>
.coin-filters {
  display: grid;
  gap: 16px;
  margin: 24px 0;
  padding: 16px;
  border: 1px solid #ddd;
}

.coin-filters label,
.range-filter,
.filter-row {
  display: grid;
  gap: 6px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.filter-grid select {
  min-width: 0;
}

.range-filter,
.filter-row {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

button {
  margin-right: 8px;
}
</style>
