<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { Category, CategoryGraphItem } from '../types'
import { validateCoinSearch, type CoinFilterState } from '../composables/useCoinFilters'

type DictionaryItem = { id: number; name: string }
type Dictionaries = Record<string, DictionaryItem[]>

const props = defineProps<{ filters: CoinFilterState; showStatus?: boolean }>()
const emit = defineEmits<{ submit: [] }>()

const dictionaries = ref<Dictionaries>({ countries: [], issuers: [], denominations: [], mints: [], materials: [], states: [], eras: [] })
const categories = ref<Category[]>([])
const errorMessage = ref('')
const dictionaryLabels: Record<string, string> = { countries: 'Kraj', issuers: 'Emitent', denominations: 'Nominał', mints: 'Mennica', materials: 'Materiał', states: 'Stan', eras: 'Era' }

function submit(): void {
  const validationError = validateCoinSearch(props.filters.search)
  errorMessage.value = validationError
  if (!validationError) emit('submit')
}

async function loadFilters(): Promise<void> {
  try {
    const names = Object.keys(dictionaries.value)
    const [dictionaryResults, categoryResponse] = await Promise.all([
      Promise.all(names.map(async (name) => {
        const response = await fetch(`/api/dictionaries/${name}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return [name, await response.json() as DictionaryItem[]] as const
      })),
      fetch('/api/categories'),
    ])
    if (!categoryResponse.ok) throw new Error(`HTTP ${categoryResponse.status}`)
    for (const [name, items] of dictionaryResults) dictionaries.value[name] = items
    categories.value = await categoryResponse.json() as CategoryGraphItem[]
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać danych filtrów.'
  }
}

defineExpose({ reload: loadFilters })
onMounted(loadFilters)
</script>

<template>
  <form class="coin-filters" @submit.prevent="submit">
    <label>Szukaj
      <input v-model="props.filters.search" type="search" placeholder="np. polska grosz" />
    </label>

    <div class="filter-grid">
      <label v-for="(items, name) in dictionaries" :key="name">
        {{ dictionaryLabels[name] }}
        <select v-model="props.filters.dictionarySelections[name as keyof typeof props.filters.dictionarySelections]" multiple size="4">
          <option v-for="item in items" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>
      <label>Kategorie
        <select v-model="props.filters.categoryIds" multiple size="4">
          <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
      </label>
    </div>

    <label><input v-model="props.filters.includeCategoryChildren" type="checkbox" /> Uwzględniaj podkategorie</label>

    <div class="range-filter">
      <label>Rok od <input v-model.number="props.filters.fromYear" type="number" /></label>
      <label>Rok do <input v-model.number="props.filters.toYear" type="number" /></label>
    </div>

    <div class="filter-row">
      <label>Zdjęcie
        <select v-model="props.filters.hasImage"><option value="">Dowolne</option><option value="true">Ma zdjęcie</option><option value="false">Brak zdjęcia</option></select>
      </label>
      <label>Wideo
        <select v-model="props.filters.hasVideo"><option value="">Dowolne</option><option value="true">Ma wideo</option><option value="false">Brak wideo</option></select>
      </label>
      <label v-if="props.showStatus">Status
        <select v-model="props.filters.statusFilter"><option value="active">Aktywne</option><option value="archived">Archiwalne</option><option value="all">Wszystkie</option></select>
      </label>
      <label>Sortuj po
        <select v-model="props.filters.sortBy"><option value="id">ID</option><option value="from_year">Rok od</option><option value="to_year">Rok do</option></select>
      </label>
      <label>Kierunek
        <select v-model="props.filters.sortOrder"><option value="asc">Rosnąco</option><option value="desc">Malejąco</option></select>
      </label>
    </div>

    <button type="submit">Szukaj / filtruj</button>
    <p v-if="errorMessage">{{ errorMessage }}</p>
  </form>
</template>

<style scoped>
.coin-filters { display: grid; gap: 16px; margin: 24px 0; padding: 16px; border: 1px solid #ddd; }
.coin-filters label, .range-filter, .filter-row { display: grid; gap: 6px; }
.filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.filter-grid select { min-width: 0; }
.range-filter, .filter-row { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
</style>
