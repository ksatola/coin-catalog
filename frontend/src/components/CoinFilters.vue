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

    <label class="checkbox-field"><input v-model="props.filters.includeCategoryChildren" type="checkbox" /> Uwzględniaj podkategorie</label>

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

    <button class="submit-button" type="submit">Szukaj / filtruj</button>
    <p v-if="errorMessage" class="filter-error">{{ errorMessage }}</p>
  </form>
</template>

<style scoped>
.coin-filters {
  display: grid;
  gap: 20px;
  margin: 28px 0 20px;
  padding: 24px;
  border: 1px solid #dbe3ee;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.coin-filters label {
  display: grid;
  gap: 7px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.coin-filters input,
.coin-filters select {
  min-height: 42px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.filter-grid label:first-child {
  grid-column: span 2;
}

.filter-grid select {
  min-width: 0;
  width: 100%;
  min-height: 132px;
  padding: 6px 4px;
}

.filter-grid option {
  padding: 5px 4px;
}

.checkbox-field {
  display: flex !important;
  grid-template-columns: none !important;
  align-items: center;
  justify-content: flex-start;
  gap: 9px !important;
  width: fit-content;
  font-weight: 500 !important;
}

.checkbox-field input {
  width: 16px;
  height: 16px;
  min-height: 16px;
  margin: 0;
}

.range-filter,
.filter-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.filter-row {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.filter-row select {
  min-height: 42px;
}

.submit-button {
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 7px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 700;
}

.submit-button:hover {
  background: #1d4ed8;
}

.filter-error {
  margin: -4px 0 0;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 960px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-grid label:first-child {
    grid-column: span 2;
  }

  .filter-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .coin-filters {
    padding: 16px;
  }

  .filter-grid,
  .range-filter,
  .filter-row {
    grid-template-columns: 1fr;
  }

  .filter-grid label:first-child {
    grid-column: auto;
  }
}
</style>
