<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { Category, CategoryGraphItem, Collection } from '../types'
import type { SortKey } from '../composables/useCoinFilters'
import { validateCoinSearch, type CoinFilterState } from '../composables/useCoinFilters'

type DictionaryItem = { id: number; name: string }
type Dictionaries = Record<string, DictionaryItem[]>

const props = defineProps<{ filters: CoinFilterState; showStatus?: boolean }>()
const emit = defineEmits<{ submit: []; reset: [] }>()

const dictionaries = ref<Dictionaries>({ countries: [], issuers: [], denominations: [], mints: [], materials: [], states: [], eras: [] })
const categories = ref<Category[]>([])
const collections = ref<Collection[]>([])
const validationErrorMessage = ref('')
const filtersLoadErrorMessage = ref('')
const dictionaryLabels: Record<string, string> = { countries: 'Kraj', issuers: 'Emitent', denominations: 'Nominał', mints: 'Mennica', materials: 'Materiał', states: 'Stan', eras: 'Era' }
const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'id', label: 'ID techniczne' },
  { value: 'collection_number', label: 'ID w kolekcji' },
  { value: 'from_year', label: 'Rok emisji od' },
  { value: 'to_year', label: 'Rok emisji do' },
  { value: 'created_at', label: 'Data dodania' },
  { value: 'updated_at', label: 'Data modyfikacji' },
  { value: 'purchase_date', label: 'Data zakupu' },
  { value: 'country', label: 'Kraj' },
  { value: 'issuer', label: 'Emitent' },
  { value: 'denomination', label: 'Nominał' },
  { value: 'material', label: 'Materiał' },
  { value: 'mint', label: 'Mennica' },
]
function clearSorting(): void {
  props.filters.sortCriteria.splice(0, props.filters.sortCriteria.length, { key: 'id', direction: 'asc' })
}

function addSortCriterion(): void {
  const used = props.filters.sortCriteria.map((criterion) => criterion.key)
  const next = sortOptions.find((option) => !used.includes(option.value))
  if (next) {
    const idIndex = props.filters.sortCriteria.findIndex((criterion) => criterion.key === 'id')
    const insertionIndex = idIndex >= 0 ? idIndex : props.filters.sortCriteria.length
    props.filters.sortCriteria.splice(insertionIndex, 0, { key: next.value, direction: 'asc' })
  }
}
function isSortOptionDisabled(key: SortKey, index: number): boolean {
  const alreadySelected = props.filters.sortCriteria.some(
    (item, itemIndex) => item.key === key && itemIndex !== index,
  )
  return alreadySelected
}

function removeSortCriterion(index: number): void {
  if (props.filters.sortCriteria.length > 1) props.filters.sortCriteria.splice(index, 1)
}
function moveSortCriterion(index: number, offset: number): void {
  const target = index + offset
  if (target < 0 || target >= props.filters.sortCriteria.length) return
  const [criterion] = props.filters.sortCriteria.splice(index, 1)
  if (criterion) props.filters.sortCriteria.splice(target, 0, criterion)
}

const dictionaryModeKeys: Record<string, keyof Pick<CoinFilterState, 'countryMode' | 'issuerMode' | 'denominationMode' | 'mintMode' | 'materialMode' | 'stateMode' | 'eraMode'>> = {
  countries: 'countryMode', issuers: 'issuerMode', denominations: 'denominationMode', mints: 'mintMode', materials: 'materialMode', states: 'stateMode', eras: 'eraMode',
}

type DictionaryModeKey = (typeof dictionaryModeKeys)[keyof typeof dictionaryModeKeys]

function dictionaryModeKey(name: string): DictionaryModeKey {
  const key = dictionaryModeKeys[name as keyof typeof dictionaryModeKeys]
  if (!key) {
    throw new Error(`Unknown coin dictionary: ${name}`)
  }
  return key
}

function submit(): void {
  validationErrorMessage.value =
    validateCoinSearch(props.filters.search) || validateCoinSearch(props.filters.quickSearch)
  if (!validationErrorMessage.value) emit('submit')
}

async function loadFilters(): Promise<void> {
  try {
    const names = Object.keys(dictionaries.value)
    const [dictionaryResults, categoryResponse, collectionResponse] = await Promise.all([
      Promise.all(names.map(async (name) => {
        const response = await fetch(`/api/dictionaries/${name}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return [name, await response.json() as DictionaryItem[]] as const
      })),
      fetch('/api/categories'),
      fetch('/api/collections'),
    ])
    if (!categoryResponse.ok || !collectionResponse.ok) throw new Error('Filter data request failed')
    for (const [name, items] of dictionaryResults) dictionaries.value[name] = items
    categories.value = await categoryResponse.json() as CategoryGraphItem[]
    collections.value = await collectionResponse.json() as Collection[]
    filtersLoadErrorMessage.value = ''
  } catch {
    filtersLoadErrorMessage.value = 'Nie udało się pobrać danych filtrów.'
  }
}

defineExpose({ reload: loadFilters })
onMounted(loadFilters)
</script>

<template>
  <form class="coin-filters" @submit.prevent="submit">
    <section class="filter-section">
      <div class="section-heading">
        <div>
          <h3>Wyszukiwanie</h3>
          <p>Wyszukaj w opisach i pozostałych tekstowych polach monety.</p>
        </div>
      </div>
      <label class="option-card">Szukaj
        <input v-model="props.filters.search" type="search" aria-label="Szukaj" />
      </label>
    </section>

    <section class="filter-section">
      <div class="section-heading">
        <div>
          <h3>Kolekcje i kategorie</h3>
          <p>Ogranicz wyniki do wybranych kolekcji lub kategorii.</p>
        </div>
      </div>
      <div class="filter-grid secondary-grid">
        <div class="filter-card">
          <div class="filter-card-heading"><label class="filter-label">Kolekcje</label></div>
          <select v-model="props.filters.collectionIds" multiple size="4" aria-label="Kolekcje">
            <option v-for="collection in collections" :key="collection.id" :value="collection.id">{{ collection.name }}</option>
          </select>
          <span class="mode-hint">Można wybrać kilka kolekcji</span>
        </div>
        <div class="filter-card">
          <div class="filter-card-heading">
            <label class="filter-label">Kategorie</label>
            <div class="mode-toggle mode-toggle-compact" role="group" aria-label="Tryb kategorii">
              <button type="button" :class="{ active: props.filters.categoryMode === 'include' }" :aria-pressed="props.filters.categoryMode === 'include'" @click="props.filters.categoryMode = 'include'">+</button>
              <button type="button" :class="{ active: props.filters.categoryMode === 'exclude' }" :aria-pressed="props.filters.categoryMode === 'exclude'" @click="props.filters.categoryMode = 'exclude'">−</button>
            </div>
          </div>
          <select v-model="props.filters.categoryIds" multiple size="4" aria-label="Kategorie">
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
          <label class="checkbox-field"><input v-model="props.filters.includeCategoryChildren" type="checkbox" /> Uwzględniaj podkategorie</label>
          <span class="mode-hint">{{ props.filters.categoryMode === 'exclude' ? 'Wybrane kategorie zostaną wykluczone' : 'Wybrane kategorie zostaną uwzględnione' }}</span>
        </div>
      </div>
    </section>

    <section class="filter-section">
      <div class="section-heading">
        <div>
          <h3>Cechy monety</h3>
          <p>Wybierz jedną lub więcej wartości. Tryb określa, czy mają pasować, czy zostać pominięte.</p>
        </div>
      </div>
      <div class="filter-grid">
        <div v-for="(items, name) in dictionaries" :key="name" class="filter-card">
          <div class="filter-card-heading">
            <label class="filter-label">{{ dictionaryLabels[name] }}</label>
            <div class="mode-toggle mode-toggle-compact" role="group" :aria-label="dictionaryLabels[name] + ' — tryb'">
              <button type="button" :class="{ active: props.filters[dictionaryModeKey(name)] === 'include' }" :aria-pressed="props.filters[dictionaryModeKey(name)] === 'include'" @click="props.filters[dictionaryModeKey(name)] = 'include'">+</button>
              <button type="button" :class="{ active: props.filters[dictionaryModeKey(name)] === 'exclude' }" :aria-pressed="props.filters[dictionaryModeKey(name)] === 'exclude'" @click="props.filters[dictionaryModeKey(name)] = 'exclude'">−</button>
            </div>
          </div>
          <select v-model="props.filters.dictionarySelections[name as keyof typeof props.filters.dictionarySelections]" multiple size="4" :aria-label="dictionaryLabels[name]">
            <option v-for="item in items" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <span class="mode-hint">{{ props.filters[dictionaryModeKey(name)] === 'exclude' ? 'Wybrane wartości zostaną wykluczone' : 'Wybrane wartości zostaną uwzględnione' }}</span>
        </div>
      </div>
    </section>

    <section class="filter-section">
      <div class="section-heading">
        <div>
          <h3>Rok emisji</h3>
          <p>Podaj granice zakresu. Możesz zostawić jedną z nich pustą.</p>
        </div>
        <div class="mode-toggle" role="group" aria-label="Tryb zakresu lat">
          <button type="button" :class="{ active: props.filters.yearMode === 'include' }" :aria-pressed="props.filters.yearMode === 'include'" @click="props.filters.yearMode = 'include'">Uwzględnij zakres</button>
          <button type="button" :class="{ active: props.filters.yearMode === 'exclude' }" :aria-pressed="props.filters.yearMode === 'exclude'" @click="props.filters.yearMode = 'exclude'">Wyklucz zakres</button>
        </div>
      </div>
      <div class="year-grid">
        <label>Rok od<input v-model.number="props.filters.fromYear" type="number" placeholder="np. 1800" /></label>
        <label>Rok do<input v-model.number="props.filters.toYear" type="number" placeholder="np. 1900" /></label>
      </div>
    </section>

    <section class="filter-section">
      <div class="section-heading">
        <div>
          <h3>Dodatkowe opcje</h3>
          <p>Media, status i kolejność wyświetlania wyników.</p>
        </div>
      </div>
      <div class="options-grid">
        <div class="option-card">
          <label class="filter-label">Zdjęcie</label>
          <select v-model="props.filters.hasImage"><option value="">Dowolne</option><option value="true">Ma zdjęcie</option><option value="false">Brak zdjęcia</option></select>
        </div>
        <div class="option-card">
          <label class="filter-label">Wideo</label>
          <select v-model="props.filters.hasVideo"><option value="">Dowolne</option><option value="true">Ma wideo</option><option value="false">Brak wideo</option></select>
        </div>
        <label v-if="props.showStatus" class="option-card">Status
          <select v-model="props.filters.statusFilter"><option value="active">Aktywne</option><option value="archived">Archiwalne</option><option value="all">Wszystkie</option></select>
        </label>
        <div class="option-card sort-editor">
          <strong class="filter-label">Kolejność sortowania</strong>
          <p class="mode-hint">Kryteria od góry mają wyższy priorytet. Każde ma własny kierunek.</p>
          <button type="button" class="clear-sorting-button" @click="clearSorting">Wyczyść sortowanie</button>
          <div v-for="(criterion, index) in props.filters.sortCriteria" :key="`sort-${criterion.key}`" class="sort-row">
            <span class="sort-priority">{{ index + 1 }}.</span>
            <select v-model="criterion.key" :aria-label="`Kryterium sortowania ${index + 1}`">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value" :disabled="isSortOptionDisabled(option.value, index)">{{ option.label }}</option>
            </select>
            <select v-model="criterion.direction" :aria-label="`Kierunek sortowania ${index + 1}`">
              <option value="asc">Rosnąco</option>
              <option value="desc">Malejąco</option>
            </select>
            <button type="button" :aria-label="`Przesuń kryterium ${index + 1} w górę`" :disabled="index === 0" @click="moveSortCriterion(index, -1)">↑</button>
            <button type="button" :aria-label="`Przesuń kryterium ${index + 1} w dół`" :disabled="index === props.filters.sortCriteria.length - 1" @click="moveSortCriterion(index, 1)">↓</button>
            <button type="button" :aria-label="`Usuń kryterium ${index + 1}`" :disabled="props.filters.sortCriteria.length === 1" @click="removeSortCriterion(index)">×</button>
          </div>
          <button type="button" class="add-sort-button" :disabled="props.filters.sortCriteria.length >= sortOptions.length" @click="addSortCriterion">+ Dodaj kryterium</button>
          <button type="button" class="clear-sorting-button" @click="clearSorting">Wyczyść sortowanie</button>
        </div>
      </div>
    </section>

    <div class="form-actions">
      <button class="submit-button" type="submit">Szukaj / filtruj</button>
      <button class="reset-button" type="button" @click="emit('reset')">Wyczyść filtry</button>
      <p v-if="validationErrorMessage" class="filter-error">{{ validationErrorMessage }}</p>
      <p v-if="filtersLoadErrorMessage" class="filter-error">{{ filtersLoadErrorMessage }}</p>
    </div>
  </form>
</template>

<style scoped>
.coin-filters {
  display: grid;
  gap: 22px;
  margin: 24px 0 20px;
  padding: 22px;
  border: 1px solid #dbe3ee;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.filter-section {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e8edf4;
}

.section-heading h3 {
  margin: 0;
  color: #172554;
  font-size: 15px;
  font-weight: 700;
}

.section-heading p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
}

.coin-filters label,
.filter-label {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.coin-filters input,
.coin-filters select {
  box-sizing: border-box;
  min-width: 0;
  min-height: 40px;
  width: 100%;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
}

.coin-filters input[type="search"],
.coin-filters input[type="number"],
.coin-filters select:not([multiple]) {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #fff;
  color: #0f172a;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.sort-editor {
  grid-column: 1 / -1;
}
.sort-row {
  display: grid;
  grid-template-columns: 28px minmax(150px, 1fr) minmax(120px, 0.7fr) repeat(3, 36px);
  gap: 6px;
  align-items: center;
}
.sort-priority {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
.sort-row button,
.add-sort-button,
.clear-sorting-button {
  min-height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}
.sort-row button:disabled,
.add-sort-button:disabled {
  opacity: 0.4;
  cursor: default;
}
.add-sort-button {
  justify-self: start;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
}
.clear-sorting-button {
  justify-self: start;
  min-height: 36px;
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.clear-sorting-button:hover {
  background: #f8fafc;
}

.option-card {
  display: grid;
  align-content: start;
  gap: 9px;
  min-width: 0;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #fbfcfe;
}

.filter-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
}

.filter-card select[multiple] {
  height: 126px;
  padding: 5px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
}

.filter-card select[multiple] option {
  padding: 4px;
}

.mode-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 2px;
  padding: 3px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #f8fafc;
}

.mode-toggle button {
  min-height: 30px;
  padding: 5px 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.mode-toggle button.active {
  background: #e2e8f0;
  color: #0f172a;
  box-shadow: inset 0 0 0 1px #cbd5e1;
}

.mode-toggle button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.mode-toggle-compact {
  gap: 1px;
  padding: 2px;
}

.mode-toggle-compact button {
  min-width: 28px;
  min-height: 26px;
  padding: 4px 8px;
}

.mode-hint {
  color: #64748b;
  font-size: 11px;
  font-weight: 400;
}

.secondary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 500 !important;
}

.checkbox-field input {
  width: 15px;
  min-height: 15px;
  height: 15px;
  margin: 0;
}

.year-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.year-grid label {
  display: grid;
  gap: 7px;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.option-card {
  gap: 8px;
}

.option-card select {
  align-self: end;
}

.form-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 2px;
}

.form-actions .submit-button {
  flex: 1 1 220px;
  width: auto;
}

.reset-button {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #fff;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.reset-button:hover {
  background: #f8fafc;
}

.submit-button {
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 7px;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.submit-button:hover {
  background: #1d4ed8;
}

.filter-error {
  margin: 0;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 900px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .options-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 600px) {
  .coin-filters {
    gap: 18px;
    padding: 14px;
  }

  .filter-grid,
  .secondary-grid,
  .year-grid,
  .options-grid {
    grid-template-columns: 1fr;
  }

  .section-heading .mode-toggle {
    max-width: 100%;
  }

  .mode-toggle button {
    padding-inline: 8px;
  }
}
</style>
