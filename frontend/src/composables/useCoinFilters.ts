import { reactive } from 'vue'

export type CoinFilterScope = 'coins' | 'archive'

type DictionarySelections = {
  countries: number[]
  issuers: number[]
  denominations: number[]
  mints: number[]
  materials: number[]
  states: number[]
  eras: number[]
}

export type CoinFilterState = {
  search: string
  dictionarySelections: DictionarySelections
  collectionIds: number[]
  categoryIds: number[]
  includeCategoryChildren: boolean
  fromYear: number | null
  toYear: number | null
  hasImage: string
  hasVideo: string
  statusFilter: string
  sortBy: string
  sortOrder: string
}

function createState(statusFilter: string): CoinFilterState {
  return reactive({
    search: '',
    dictionarySelections: {
      countries: [],
      issuers: [],
      denominations: [],
      mints: [],
      materials: [],
      states: [],
      eras: [],
    },
    collectionIds: [],
    categoryIds: [],
    includeCategoryChildren: true,
    fromYear: null,
    toYear: null,
    hasImage: '',
    hasVideo: '',
    statusFilter,
    sortBy: 'id',
    sortOrder: 'asc',
  })
}

const states: Record<CoinFilterScope, CoinFilterState> = {
  coins: createState('active'),
  archive: createState('archived'),
}

export function useCoinFilters(scope: CoinFilterScope): CoinFilterState {
  const state = states[scope]
  const collectionIds = new URLSearchParams(window.location.search)
    .getAll('collection_id')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)

  if (collectionIds.length > 0) state.collectionIds = collectionIds
  return state
}

export function validateCoinSearch(search: string): string {
  const tokens = search.trim().split(/\s+/).filter(Boolean)
  return tokens.some((token) => token.length < 3)
    ? 'Każdy fragment wyszukiwania musi mieć co najmniej 3 znaki.'
    : ''
}

export function buildCoinFilterQuery(filters: CoinFilterState): string {
  const params = new URLSearchParams()
  if (filters.search.trim()) params.set('search', filters.search.trim())

  for (const id of filters.dictionarySelections.countries) params.append('country_id', String(id))
  for (const id of filters.dictionarySelections.issuers) params.append('issuer_id', String(id))
  for (const id of filters.dictionarySelections.denominations) params.append('denomination_id', String(id))
  for (const id of filters.dictionarySelections.mints) params.append('mint_id', String(id))
  for (const id of filters.dictionarySelections.materials) params.append('material_id', String(id))
  for (const id of filters.dictionarySelections.states) params.append('state_id', String(id))
  for (const id of filters.dictionarySelections.eras) params.append('era_id', String(id))
  for (const id of filters.collectionIds) params.append('collection_id', String(id))
  for (const id of filters.categoryIds) params.append('category_id', String(id))

  params.set('include_category_children', String(filters.includeCategoryChildren))
  if (filters.fromYear !== null) params.set('from_year', String(filters.fromYear))
  if (filters.toYear !== null) params.set('to_year', String(filters.toYear))
  if (filters.hasImage) params.set('has_image', filters.hasImage)
  if (filters.hasVideo) params.set('has_video', filters.hasVideo)
  params.set('status', filters.statusFilter)
  params.set('sort_by', filters.sortBy)
  params.set('sort_order', filters.sortOrder)

  return params.toString()
}

export function resetCoinFilters(filters: CoinFilterState, defaultStatus: string): void {
  filters.search = ''
  filters.dictionarySelections.countries = []
  filters.dictionarySelections.issuers = []
  filters.dictionarySelections.denominations = []
  filters.dictionarySelections.mints = []
  filters.dictionarySelections.materials = []
  filters.dictionarySelections.states = []
  filters.dictionarySelections.eras = []
  filters.collectionIds = []
  filters.categoryIds = []
  filters.includeCategoryChildren = true
  filters.fromYear = null
  filters.toYear = null
  filters.hasImage = ''
  filters.hasVideo = ''
  filters.statusFilter = defaultStatus
  filters.sortBy = 'id'
  filters.sortOrder = 'asc'
}
