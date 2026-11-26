<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import CoinFilters from '../components/CoinFilters.vue'
import CoinGrid from '../components/CoinGrid.vue'
import CoinImageGrid from '../components/CoinImageGrid.vue'
import CoinList from '../components/CoinList.vue'
import CoinScaleCalibration from '../components/CoinScaleCalibration.vue'
import CoinSizeGallery from '../components/CoinSizeGallery.vue'
import { buildCoinFilterQuery, parseCoinFilterQuery, resetCoinFilters, useCoinFilters } from '../composables/useCoinFilters'
import type { Coin, CoinPageResponse, Collection } from '../types'
import { consumeCoinCatalogStale } from '../composables/coinCatalogFreshness'

type CatalogScope = 'coins' | 'archive'
type ViewMode = 'image-grid' | 'size-gallery' | 'grid' | 'list'
type SizeGalleryScale = 25 | 50 | 75 | 100 | 125 | 150 | 200
type GalleryColumns = 1 | 2 | 3 | 4

const props = defineProps<{
  scope: CatalogScope
}>()

const router = useRouter()
const filters = useCoinFilters(props.scope)
const filterStateStorageKey = `coin-catalog:filter-state:${props.scope}`
const sortCriteriaStorageKey = `coin-catalog:sort-criteria:${props.scope}`
const storedFilterState = sessionStorage.getItem(filterStateStorageKey)
if (storedFilterState) {
  Object.assign(filters, parseCoinFilterQuery(storedFilterState))
}
const storedSortCriteria = sessionStorage.getItem(sortCriteriaStorageKey)
if (storedSortCriteria) {
  filters.sortCriteria = parseCoinFilterQuery(storedSortCriteria).sortCriteria
}
watch(() => filters.sortCriteria, (criteria) => {
  const params = new URLSearchParams()
  for (const criterion of criteria) {
    params.append('sort_by', criterion.key)
    params.append('sort_order', criterion.direction)
  }
  sessionStorage.setItem(sortCriteriaStorageKey, params.toString())
}, { deep: true })
const coins = ref<Coin[]>([])
const collections = ref<Collection[]>([])
type NamedFilterValue = { id: number; name: string }
const filterDictionaries = ref<Record<string, NamedFilterValue[]>>({})
const categories = ref<NamedFilterValue[]>([])
const errorMessage = ref('')
const appliedFilterQuery = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(true)
const loadingMore = ref(false)
const initialLoading = ref(true)
const sentinel = ref<HTMLElement | null>(null)
const showAdvancedFilters = ref(false)
const advancedFiltersDialog = ref<HTMLDialogElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let requestGeneration = 0
let observer: IntersectionObserver | undefined
let hasMountedCatalog = false
const isRestoringScroll = ref(true)

const isArchive = props.scope === 'archive'
const pageTitle = isArchive ? 'Archiwum' : 'Monety'
const pageSubtitle = isArchive ? 'Zarchiwizowane monety' : 'Katalog kolekcji'
const emptyTitle = isArchive ? 'Brak zarchiwizowanych monet' : 'Brak monet'
const emptyDescription = isArchive
  ? 'Nie znaleziono monet spełniających kryteria archiwum.'
  : 'Nie znaleziono monet spełniających kryteria.'
const viewModeStorageKey = `coin-catalog:view-mode:${props.scope}`
const galleryColumnsStorageKey = `coin-catalog:gallery-columns:${props.scope}`
const sizeGalleryScaleStorageKey = `coin-catalog:size-gallery-scale:${props.scope}`
const sizeGalleryCalibrationStorageKey = `coin-catalog:size-gallery-calibration:${props.scope}`
function scrollPositionStorageKey(mode: ViewMode = viewMode.value): string {
  // Each presentation has a different layout height, so each needs its own
  // remembered viewport position. Scope also separates the active catalogue
  // from the archive.
  return `coin-catalog:scroll-position:${props.scope}:${mode}`
}

function saveCatalogScrollPosition(mode: ViewMode = viewMode.value): void {
  sessionStorage.setItem(scrollPositionStorageKey(mode), String(window.scrollY))
}
const DEFAULT_PIXELS_PER_MM = 96 / 25.4

function loadViewMode(): ViewMode {
  const stored = sessionStorage.getItem(viewModeStorageKey)
  return stored === 'image-grid' || stored === 'size-gallery' || stored === 'grid' || stored === 'list'
    ? stored
    : 'image-grid'
}

function loadGalleryColumns(): GalleryColumns {
  const stored = Number(sessionStorage.getItem(galleryColumnsStorageKey))
  return stored === 1 || stored === 2 || stored === 3 || stored === 4
    ? stored
    : 2
}

const viewMode = ref<ViewMode>(loadViewMode())
const galleryColumns = ref<GalleryColumns>(loadGalleryColumns())

function loadSizeGalleryScale(): SizeGalleryScale {
  const stored = Number(sessionStorage.getItem(sizeGalleryScaleStorageKey))
  return stored === 25 || stored === 50 || stored === 75 || stored === 100 || stored === 125 || stored === 150 || stored === 200 ? stored : 100
}

const sizeGalleryScale = ref<SizeGalleryScale>(loadSizeGalleryScale())

function loadSizeGalleryPixelsPerMm(): number {
  const stored = Number(localStorage.getItem(sizeGalleryCalibrationStorageKey))
  return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_PIXELS_PER_MM
}

const sizeGalleryPixelsPerMm = ref(loadSizeGalleryPixelsPerMm())
const showSizeGalleryCalibration = ref(false)
const sizeGalleryIsCalibrated = ref(localStorage.getItem(sizeGalleryCalibrationStorageKey) !== null)

const sortLabels: Record<string, string> = {
  id: 'ID', collection_number: 'ID w kolekcji', from_year: 'Rok od', to_year: 'Rok do',
  created_at: 'Data dodania', updated_at: 'Data modyfikacji', purchase_date: 'Data zakupu',
  country: 'Kraj', issuer: 'Emitent', denomination: 'Nominał', material: 'Materiał', mint: 'Mennica',
}
const filterLabels: Record<string, string> = {
  countries: 'Kraj', issuers: 'Emitent', denominations: 'Nominał', mints: 'Mennica',
  materials: 'Materiał', states: 'Stan', eras: 'Era',
}
const appliedCriteria = computed(() => {
  const params = new URLSearchParams(appliedFilterQuery.value)
  const chips: string[] = []
  const add = (label: string, value: string) => { if (value) chips.push(`${label}: ${value}`) }
  add('Szukaj', params.get('search') ? `${params.get('search_mode') === 'exclude' ? 'bez ' : ''}"${params.get('search')}"` : '')
  add('Szybkie szukanie', params.get('quick_search') ? `${params.get('quick_search_mode') === 'exclude' ? 'bez ' : ''}"${params.get('quick_search')}"` : '')
  const dictionaryPrefixes: Record<string, string> = {
    countries: 'country', issuers: 'issuer', denominations: 'denomination', mints: 'mint',
    materials: 'material', states: 'state', eras: 'era',
  }
  for (const [key, label] of Object.entries(filterLabels)) {
    const prefix = dictionaryPrefixes[key]
    const ids = params.getAll(`${prefix}_id`)
    if (!ids.length) continue
    const values = ids.map((id) => filterDictionaries.value[key]?.find((item) => item.id === Number(id))?.name ?? `#${id}`)
    add(label, `${params.get(`${prefix}_mode`) === 'exclude' ? 'bez ' : ''}${values.join(', ')}`)
  }
  const collectionIds = params.getAll('collection_id')
  if (collectionIds.length) {
    add('Kolekcja', collectionIds.map((id) => collections.value.find((item) => item.id === Number(id))?.name ?? `#${id}`).join(', '))
  }
  const categoryIds = params.getAll('category_id')
  if (categoryIds.length) {
    const names = categoryIds.map((id) => categories.value.find((item) => item.id === Number(id))?.name ?? `#${id}`)
    add('Kategoria', `${params.get('category_mode') === 'exclude' ? 'bez ' : ''}${names.join(', ')}${params.get('include_category_children') === 'false' ? ' (bez podkategorii)' : ''}`)
  }
  if (params.has('from_year') || params.has('to_year')) {
    add('Rok emisji', `${params.get('year_mode') === 'exclude' ? 'poza ' : ''}${params.get('from_year') || '…'}–${params.get('to_year') || '…'}`)
  }
  if (params.has('has_image')) add('Zdjęcie', params.get('has_image') === 'true' ? 'jest' : 'brak')
  if (params.has('has_video')) add('Wideo', params.get('has_video') === 'true' ? 'jest' : 'brak')
  const sortKeys = params.getAll('sort_by')
  const sortOrders = params.getAll('sort_order')
  const sorting = sortKeys.map((key, index) => `${sortLabels[key] ?? key} ${sortOrders[index] === 'desc' ? '↓' : '↑'}`)
  return { filters: chips, sorting }
})

async function loadFilterSummaryOptions(): Promise<void> {
  const names = Object.keys(filterLabels)
  const [dictionaryResults, categoryResponse] = await Promise.all([
    Promise.all(names.map(async (name) => {
      const response = await fetch(`/api/dictionaries/${name}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return [name, await response.json() as NamedFilterValue[]] as const
    })),
    fetch('/api/categories', { cache: 'no-store' }),
  ])
  for (const [name, items] of dictionaryResults) filterDictionaries.value[name] = items
  if (categoryResponse.ok) categories.value = await categoryResponse.json() as NamedFilterValue[]
}

function activeCollectionScopeLabel(): string {
  const ids = filters.collectionIds
  if (ids.length === 0) return 'Wszystkie kolekcje'

  const names = ids
    .map((id) => collections.value.find((collection) => collection.id === id)?.name ?? `Kolekcja #${id}`)

  return names.length === 1
    ? names[0] ?? ''
    : names.join(', ')
}

async function loadCollections(): Promise<void> {
  try {
    const [response] = await Promise.all([
      fetch('/api/collections', { cache: 'no-store' }),
      loadFilterSummaryOptions(),
    ])
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    collections.value = await response.json() as Collection[]
  } catch {
    collections.value = []
    filterDictionaries.value = {}
    categories.value = []
  }
}

watch(viewMode, (mode, previousMode) => {
  // Capture the outgoing layout before Vue changes its rendered content.
  saveCatalogScrollPosition(previousMode)
  sessionStorage.setItem(viewModeStorageKey, mode)

  // Restore the last viewport for the incoming layout after its DOM is updated.
  isRestoringScroll.value = true
  void nextTick().then(() => restoreCatalogScrollPosition(mode))
}, { flush: 'sync' })

watch(galleryColumns, (columns) => {
  sessionStorage.setItem(galleryColumnsStorageKey, String(columns))
})

watch(sizeGalleryScale, (scale) => {
  sessionStorage.setItem(sizeGalleryScaleStorageKey, String(scale))
})

function saveSizeGalleryCalibration(pixelsPerMm: number): void {
  sizeGalleryPixelsPerMm.value = pixelsPerMm
  sizeGalleryIsCalibrated.value = true
  localStorage.setItem(sizeGalleryCalibrationStorageKey, String(pixelsPerMm))
  showSizeGalleryCalibration.value = false
}

function isSearchReady(): boolean {
  return [filters.search, filters.quickSearch].every((value) => {
    const search = value.trim()
    return !search || !search.split(/\s+/).some((token) => token.length < 3)
  })
}

watch(() => [filters.search, filters.searchMode, filters.quickSearch, filters.quickSearchMode], () => {
  if (searchTimer !== undefined) {
    clearTimeout(searchTimer)
  }

  if (!isSearchReady()) {
    errorMessage.value = ''
    return
  }

  searchTimer = setTimeout(() => {
    void loadCoins()
  }, 250)
})

async function loadCoins(): Promise<void> {
  if (!isSearchReady()) {
    return
  }

  const generation = ++requestGeneration
  const scrollY = window.scrollY
  const isInitialLoad = coins.value.length === 0
  if (isInitialLoad) {
    initialLoading.value = true
  }
  loadingMore.value = true

  try {
    const query = buildCoinFilterQuery(filters)
    const params = new URLSearchParams(query)
    const previousParams = new URLSearchParams(appliedFilterQuery.value)
    const sortChanged = appliedFilterQuery.value !== "" && (
      previousParams.getAll("sort_by").join("|") !== params.getAll("sort_by").join("|") ||
      previousParams.getAll("sort_order").join("|") !== params.getAll("sort_order").join("|")
    )
    if (sortChanged) {
      for (const mode of ["image-grid", "size-gallery", "grid", "list"] as ViewMode[]) {
        sessionStorage.removeItem(scrollPositionStorageKey(mode))
      }
      window.scrollTo(0, 0)
    }
    params.set('limit', '50')
    const response = await fetch(`/api/coins?${params.toString()}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const page = await response.json() as CoinPageResponse
    if (generation !== requestGeneration) return

    coins.value = page.items
    nextCursor.value = page.next_cursor
    hasMore.value = page.has_more
    appliedFilterQuery.value = query
    sessionStorage.setItem(filterStateStorageKey, query)
    errorMessage.value = ''
    await nextTick()
    // Preserve the current viewport when filters trigger a reload.
    // History-entry restoration runs separately after the initial catalogue load.
    if (hasMountedCatalog && !sortChanged) {
      window.scrollTo(0, scrollY)
    }
  } catch {
    if (generation !== requestGeneration) return
    errorMessage.value = isArchive
      ? 'Nie udało się pobrać archiwum.'
      : 'Nie udało się pobrać monet.'
  } finally {
    if (generation === requestGeneration) {
      loadingMore.value = false
      initialLoading.value = false
    }
  }
}

async function loadMoreCoins(): Promise<void> {
  if (!isSearchReady() || !hasMore.value || !nextCursor.value || loadingMore.value) {
    return
  }

  const generation = requestGeneration
  loadingMore.value = true

  try {
    const query = buildCoinFilterQuery(filters)
    const params = new URLSearchParams(query)
    params.set('limit', '50')
    params.set('cursor', nextCursor.value)

    const response = await fetch(`/api/coins?${params.toString()}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const page = await response.json() as CoinPageResponse
    if (generation !== requestGeneration) return

    coins.value = [...coins.value, ...page.items]
    nextCursor.value = page.next_cursor
    hasMore.value = page.has_more
    errorMessage.value = ''
  } catch {
    if (generation !== requestGeneration) return
    errorMessage.value = isArchive
      ? 'Nie udało się pobrać kolejnej części archiwum.'
      : 'Nie udało się pobrać kolejnej części katalogu.'
  } finally {
    if (generation === requestGeneration) {
      loadingMore.value = false
    }
  }
}

async function restoreCatalogScrollPosition(mode: ViewMode = viewMode.value): Promise<void> {
  try {
    const savedScrollPosition = Number(sessionStorage.getItem(scrollPositionStorageKey(mode)))
    if (!Number.isFinite(savedScrollPosition) || savedScrollPosition <= 0) return

    const maximumScroll = (): number => Math.max(
      0,
      Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight,
    )

    // Rebuild enough of the infinite-scroll result set before restoring the saved position.
    while (hasMore.value && nextCursor.value && maximumScroll() < savedScrollPosition) {
      const previousCount = coins.value.length
      await loadMoreCoins()
      await nextTick()
      if (coins.value.length === previousCount) break
    }

    await nextTick()
    window.scrollTo(0, Math.min(savedScrollPosition, maximumScroll()))
  } finally {
    isRestoringScroll.value = false
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

function openCoinDetails(coin: Coin): void {
  const query = appliedFilterQuery.value
  router.push(`/monety/${coin.id}${query ? `?${query}` : ''}`)
}

function resetFilters(): void {
  resetCoinFilters(filters, isArchive ? 'archived' : 'active')
  void loadCoins()
  closeAdvancedFilters()
}

function closeAdvancedFilters(): void {
  advancedFiltersDialog.value?.close()
  showAdvancedFilters.value = false
}

function toggleAdvancedFilters(): void {
  if (showAdvancedFilters.value) {
    closeAdvancedFilters()
  } else {
    showAdvancedFilters.value = true
  }
}

function triggerAdvancedFilterSubmit(): void {
  advancedFiltersDialog.value?.querySelector('form')?.requestSubmit()
}

function submitAdvancedFilters(): void {
  void loadCoins()
  closeAdvancedFilters()
}

let previousBodyOverflow = ''

watch(showAdvancedFilters, async (isOpen) => {
  if (isOpen) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    const dialog = advancedFiltersDialog.value
    if (dialog && !dialog.open) dialog.showModal()
    return
  }

  document.body.style.overflow = previousBodyOverflow
})

watch([sentinel, loadingMore, () => isRestoringScroll.value], ([element, isLoading, isRestoring]) => {
  observer?.disconnect()
  observer = undefined

  if (!element || isLoading || isRestoring) return

  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      void loadMoreCoins()
    }
  }, { rootMargin: '800px 0px' })

  observer.observe(element)
})

onBeforeRouteLeave(() => {
  saveCatalogScrollPosition()

  // A route change can happen while the native filter dialog is open.
  // Release its body scroll lock synchronously before the next view mounts.
  if (showAdvancedFilters.value) {
    advancedFiltersDialog.value?.close()
    showAdvancedFilters.value = false
    document.body.style.overflow = previousBodyOverflow
  }
})

onMounted(async () => {
  // Initial mount always fetches the first page, so any pending invalidation is consumed.
  consumeCoinCatalogStale(props.scope)
  await Promise.all([loadCoins(), loadCollections()])
  hasMountedCatalog = true

  await restoreCatalogScrollPosition()
})

onActivated(async () => {
  if (!hasMountedCatalog) return

  isRestoringScroll.value = true
  if (consumeCoinCatalogStale(props.scope)) {
    await loadCoins()
  }
  await restoreCatalogScrollPosition()
})

onDeactivated(() => {
  observer?.disconnect()
  observer = undefined
})

onUnmounted(() => {
  observer?.disconnect()
  if (searchTimer !== undefined) clearTimeout(searchTimer)
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <section class="coins-view">
    <div class="sticky-catalog-toolbar">
    <header class="page-header">
      <div>
        <h1>{{ pageTitle }}</h1>
      </div>

      <div class="header-controls">
        <div class="view-switcher" aria-label="Sposób wyświetlania monet">
          <button type="button" :class="{ active: viewMode === 'image-grid' }" :disabled="viewMode === 'image-grid'" @click="viewMode = 'image-grid'">
            ▦ Galeria
          </button>
          <button type="button" :class="{ active: viewMode === 'size-gallery' }" :disabled="viewMode === 'size-gallery'" @click="viewMode = 'size-gallery'">
            ◉ Rozmiar
          </button>
          <button type="button" :class="{ active: viewMode === 'grid' }" :disabled="viewMode === 'grid'" @click="viewMode = 'grid'">
            ▦ Grid
          </button>
          <button type="button" :class="{ active: viewMode === 'list' }" :disabled="viewMode === 'list'" @click="viewMode = 'list'">
            ☷ Lista
          </button>
        </div>

        <div v-if="viewMode === 'image-grid'" class="gallery-columns" aria-label="Liczba monet w wierszu">
          <span>Monet w wierszu:</span>
          <button
            v-for="columns in [1, 2, 3, 4] as GalleryColumns[]"
            :key="columns"
            type="button"
            :class="{ active: galleryColumns === columns }"
            :aria-label="`${columns} monet w wierszu`"
            :aria-pressed="galleryColumns === columns"
            @click="galleryColumns = columns"
          >
            {{ columns }}
          </button>
        </div>

        <div v-if="viewMode === 'size-gallery'" class="gallery-scale" aria-label="Skala galerii rozmiarów">
          <span>Skala:</span>
          <button
            v-for="scale in [25, 50, 75, 100, 125, 150, 200] as SizeGalleryScale[]"
            :key="scale"
            type="button"
            :class="{ active: sizeGalleryScale === scale, 'scale-calibrated': scale === 100 && sizeGalleryIsCalibrated }"
            :aria-label="scale === 100
              ? (sizeGalleryIsCalibrated ? 'Skala 100%, skalibrowana' : 'Skala 100%, wymaga kalibracji')
              : `Skala ${scale}%`"
            :title="scale === 100
              ? (sizeGalleryIsCalibrated ? '100% = rzeczywisty rozmiar' : '100% wymaga kalibracji')
              : undefined"
            :aria-pressed="sizeGalleryScale === scale"
            @click="sizeGalleryScale = scale"
          >
            <span v-if="scale === 100" class="scale-value">
              <span>100%</span>
              <small aria-hidden="true">{{ sizeGalleryIsCalibrated ? '✓' : '?' }}</small>
            </span>
            <span v-else>{{ scale }}%</span>
          </button>
          <button type="button" class="calibration-button" @click="showSizeGalleryCalibration = true">
            ⚙ Kalibruj ekran
          </button>
        </div>
        <CoinScaleCalibration
          v-if="showSizeGalleryCalibration"
          :pixels-per-mm="sizeGalleryPixelsPerMm"
          @save="saveSizeGalleryCalibration"
          @close="showSizeGalleryCalibration = false"
        />
      </div>
    </header>

    <form class="simple-search" @submit.prevent="loadCoins">
      <div class="search-field">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input
          v-model="filters.quickSearch"
          type="search"
          placeholder="Szukaj monet, np. polska grosz"
          aria-label="Szukaj monet"
        />
      </div>
      <div class="quick-search-mode mode-toggle" role="group" aria-label="Tryb wyszukiwania">
        <button
          type="button"
          :class="{ active: filters.quickSearchMode === 'include' }"
          :aria-pressed="filters.quickSearchMode === 'include'"
          aria-label="Uwzględnij dopasowania"
          title="Uwzględnij dopasowania"
          @click="filters.quickSearchMode = 'include'"
        >+</button>
        <button
          type="button"
          :class="{ active: filters.quickSearchMode === 'exclude' }"
          :aria-pressed="filters.quickSearchMode === 'exclude'"
          aria-label="Wyklucz dopasowania"
          title="Wyklucz dopasowania"
          @click="filters.quickSearchMode = 'exclude'"
        >−</button>
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
      <div v-if="!initialLoading && coins.length > 0" class="results-bar" aria-label="Zakres wyników">
        <div class="results-count">
          <strong>{{ coins.length }} {{ coins.length === 1 ? 'moneta' : coins.length < 5 ? 'monety' : 'monet' }}</strong>
          <span class="results-scope">{{ activeCollectionScopeLabel() }}</span>
        </div>
        <div v-if="appliedCriteria.filters.length || appliedCriteria.sorting.length" class="applied-criteria" aria-label="Aktywne kryteria">
          <span v-for="item in appliedCriteria.filters" :key="`filter-${item}`" class="criteria-chip">{{ item }}</span>
          <span v-for="(item, index) in appliedCriteria.sorting" :key="`sort-${index}`" class="criteria-chip sort-chip">
            {{ index + 1 }}. {{ item }}
          </span>
        </div>
      </div>

      <dialog v-if="showAdvancedFilters" ref="advancedFiltersDialog" id="advanced-coin-filters" class="advanced-filters" @close="showAdvancedFilters = false">
      <div class="advanced-filters-header">
        <div>
          <h2>Filtry</h2>
          <p>Uściślij wyszukiwanie według cech monety.</p>
        </div>
        <div class="advanced-filters-header-actions">
          <button type="button" class="dialog-submit-button" @click="triggerAdvancedFilterSubmit">Szukaj / filtruj</button>
          <button type="button" class="dialog-reset-button" @click="resetFilters">Wyczyść filtry</button>
          <button type="button" class="collapse-button" @click="toggleAdvancedFilters">Zwiń</button>
        </div>
      </div>

      <CoinFilters :filters="filters" show-status @submit="submitAdvancedFilters" @reset="resetFilters" @collapse="closeAdvancedFilters" />
    </dialog>
    </div>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <div v-if="initialLoading" class="loading-state" role="status">
      Ładowanie monet…
    </div>

    <div v-else-if="coins.length === 0" class="empty-state">
      <strong>{{ emptyTitle }}</strong>
      <span>{{ emptyDescription }}</span>
    </div>

    <template v-else>
      <CoinImageGrid
        v-if="viewMode === 'image-grid'"
        :coins="coins"
        :columns="galleryColumns"
        :detail-query="appliedFilterQuery"
      />
      <CoinSizeGallery
        v-else-if="viewMode === 'size-gallery'"
        :coins="coins"
        :scale="sizeGalleryScale"
        :pixels-per-mm="sizeGalleryPixelsPerMm"
        :detail-query="appliedFilterQuery"
      />
      <CoinGrid v-else-if="viewMode === 'grid'" :coins="coins" :detail-query="appliedFilterQuery" />

      <CoinList
        v-else
        :coins="coins"
        @details="openCoinDetails"
        @archive="archiveCoin"
        @restore="restoreCoin"
      />

      <div ref="sentinel" class="infinite-scroll-sentinel" aria-hidden="true">
        <span v-if="loadingMore">Ładowanie kolejnych monet…</span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.coins-view {
  display: grid;
  gap: 20px;
}

.sticky-catalog-toolbar {
  position: sticky;
  top: 24px;
  z-index: 20;
  display: grid;
  gap: 12px;
  padding: 16px 0 0;
  background: #f5f7fa;
  box-shadow: 0 12px 0 #f5f7fa;
}


.sticky-catalog-toolbar::before {
  content: '';
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  height: 24px;
  background: #f5f7fa;
  z-index: -1;
}

.page-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  padding: 0 0 4px;
}

.simple-search {
  display: flex;
  gap: 10px;
  align-items: stretch;
  padding: 0 0 4px;
}

.results-bar {
  display: grid;
  gap: 6px;
  min-height: 42px;
  padding: 6px 0 12px;
  line-height: 1.5;
}

.results-count {
  display: flex;
  align-items: center;
  gap: 10px;
}

.applied-criteria {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 6px;
}

.criteria-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
  color: #64748b;
  font-size: 11px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.sort-chip {
  border-color: #dbe3ee;
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
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

.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.view-switcher,
.gallery-columns,
.gallery-scale {
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #ffffff;
}

.view-switcher button,
.gallery-columns button,
.gallery-scale button {
  min-height: 34px;
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.view-switcher button.active,
.gallery-columns button.active,
.gallery-scale button.active {
  background: #e2e8f0;
  color: #0f172a;
}

.gallery-columns {
  align-items: center;
}

.gallery-columns span,
.gallery-scale span {
  padding: 0 5px 0 3px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.gallery-scale {
  align-items: center;
}

.gallery-scale .scale-value {
  display: grid;
  justify-items: center;
  gap: 1px;
  line-height: 1;
}

.gallery-scale .scale-value small {
  min-height: 9px;
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
}

.gallery-scale button.scale-calibrated .scale-value small {
  color: #16a34a;
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

.quick-search-mode {
  align-self: center;
  gap: 1px;
  padding: 3px;
  border: 1px solid #dbe3ee;
  border-radius: 9px;
  background: #f8fafc;
}

.quick-search-mode button {
  min-width: 34px;
  min-height: 34px;
  padding: 4px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 17px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.quick-search-mode button.active {
  background: #e2e8f0;
  color: #0f172a;
  box-shadow: inset 0 0 0 1px #cbd5e1;
}

.quick-search-mode button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.filters-toggle:hover,
.quick-search-mode:hover,
.collapse-button:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.advanced-filters {
  width: min(1200px, 100%);
  max-width: 100%;
  max-height: 100dvh;
  height: 100dvh;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 24px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 0;
  background: #ffffff;
  color: #0f172a;
}

.advanced-filters::backdrop {
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(2px);
}

.advanced-filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.advanced-filters-header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.dialog-submit-button,
.dialog-reset-button {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.dialog-submit-button {
  border: 0;
  background: #2563eb;
  color: #fff;
}

.dialog-submit-button:hover {
  background: #1d4ed8;
}

.dialog-reset-button {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
}

.dialog-reset-button:hover {
  background: #f8fafc;
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

.results-bar {
  color: #475569;
  font-size: 14px;
}

.results-scope {
  padding-left: 10px;
  border-left: 1px solid #cbd5e1;
  color: #64748b;
  font-size: 13px;
}

.infinite-scroll-sentinel {
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 13px;
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

.loading-state {
  display: grid;
  min-height: 120px;
  place-items: center;
  color: #64748b;
  font-size: 14px;
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

@media (max-width: 900px) {
  .advanced-filters {
    padding: 16px;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-controls {
    width: 100%;
    flex-wrap: wrap;
  }
}

@media (max-width: 600px) {
  .advanced-filters {
    padding: 12px;
  }

  .header-controls {
    display: grid;
    grid-template-columns: 1fr;
  }

  .view-switcher,
  .gallery-columns,
  .gallery-scale {
    width: 100%;
  }

  .view-switcher button,
  .gallery-columns button,
  .gallery-scale button {
    flex: 1;
  }

  .gallery-columns span,
  .gallery-scale span {
    flex: 0 0 auto;
  }

  .simple-search {
    flex-direction: column;
  }

  .filters-toggle,
  .quick-search-mode {
    width: 100%;
  }

  .advanced-filters {
    padding: 16px;
  }
}
</style>
