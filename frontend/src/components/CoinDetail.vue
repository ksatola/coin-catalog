<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import CoinCategoriesReadOnly from './CoinCategoriesReadOnly.vue'
import type { Coin, CoinImage } from '../types'

type DictionaryItem = {
  id: number
  name: string
}

type Dictionaries = {
  countries: DictionaryItem[]
  issuers: DictionaryItem[]
  denominations: DictionaryItem[]
  mints: DictionaryItem[]
  materials: DictionaryItem[]
  states: DictionaryItem[]
  eras: DictionaryItem[]
}

const props = defineProps<{
  coin: Coin
}>()

const dictionaries = reactive<Dictionaries>({
  countries: [],
  issuers: [],
  denominations: [],
  mints: [],
  materials: [],
  states: [],
  eras: [],
})

const primaryImages = reactive<{
  avers: CoinImage | null
  rewers: CoinImage | null
}>({
  avers: null,
  rewers: null,
})
const additionalImages = ref<CoinImage[]>([])
const imageErrorMessage = ref('')

function dictionaryName(
  items: DictionaryItem[],
  id: number | null,
): string {
  if (id === null) {
    return '—'
  }

  return items.find((item) => item.id === id)?.name ?? `#${id}`
}

async function loadDictionary(
  dictionaryNameKey: keyof Dictionaries,
): Promise<DictionaryItem[]> {
  const response = await fetch(`/api/dictionaries/${dictionaryNameKey}`)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return await response.json() as DictionaryItem[]
}

async function loadDictionaries(): Promise<void> {
  const [
    countries,
    issuers,
    denominations,
    mints,
    materials,
    states,
    eras,
  ] = await Promise.all([
    loadDictionary('countries'),
    loadDictionary('issuers'),
    loadDictionary('denominations'),
    loadDictionary('mints'),
    loadDictionary('materials'),
    loadDictionary('states'),
    loadDictionary('eras'),
  ])

  dictionaries.countries = countries
  dictionaries.issuers = issuers
  dictionaries.denominations = denominations
  dictionaries.mints = mints
  dictionaries.materials = materials
  dictionaries.states = states
  dictionaries.eras = eras
}

async function loadImages(): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${props.coin.id}/images`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const images = await response.json() as CoinImage[]
    primaryImages.avers = images.find((image) => image.kind === 'avers') ?? null
    primaryImages.rewers = images.find((image) => image.kind === 'rewers') ?? null
    additionalImages.value = images.filter((image) => image.kind === 'additional')
    imageErrorMessage.value = ''
  } catch {
    imageErrorMessage.value = 'Nie udało się pobrać zdjęć monety.'
  }
}

function imageUrl(image: CoinImage | null): string | undefined {
  if (!image) {
    return undefined
  }

  return `/api/coins/${props.coin.id}/images/${image.id}/file`
}

onMounted(() => {
  void loadDictionaries()
  void loadImages()
})
</script>

<template>
  <section>
    <h1>Szczegóły monety #{{ coin.id }}</h1>

    <p v-if="imageErrorMessage">{{ imageErrorMessage }}</p>

    <div class="primary-images">
      <figure class="primary-image-card">
        <img
          v-if="primaryImages.avers"
          :src="imageUrl(primaryImages.avers)"
          alt="Awers monety"
        />
        <div v-else class="image-placeholder">Brak zdjęcia awersu</div>
        <figcaption>Awers</figcaption>
      </figure>

      <figure class="primary-image-card">
        <img
          v-if="primaryImages.rewers"
          :src="imageUrl(primaryImages.rewers)"
          alt="Rewers monety"
        />
        <div v-else class="image-placeholder">Brak zdjęcia rewersu</div>
        <figcaption>Rewers</figcaption>
      </figure>
    </div>

    <div v-if="additionalImages.length" class="additional-images">
      <h2>Zdjęcia dodatkowe</h2>
      <div class="additional-image-list">
        <figure
          v-for="image in additionalImages"
          :key="image.id"
          class="additional-image-card"
        >
          <img :src="imageUrl(image)" :alt="image.filename" />
          <figcaption>{{ image.filename }}</figcaption>
        </figure>
      </div>
    </div>

    <dl>
      <dt>Kraj</dt>
      <dd>{{ dictionaryName(dictionaries.countries, coin.country_id) }}</dd>

      <dt>Emitent</dt>
      <dd>{{ dictionaryName(dictionaries.issuers, coin.issuer_id) }}</dd>

      <dt>Nominał</dt>
      <dd>
        {{ dictionaryName(dictionaries.denominations, coin.denomination_id) }}
      </dd>

      <dt>Era od</dt>
      <dd>{{ dictionaryName(dictionaries.eras, coin.from_era_id) }}</dd>

      <dt>Rok od</dt>
      <dd>{{ coin.from_year }}</dd>

      <dt>Era do</dt>
      <dd>{{ dictionaryName(dictionaries.eras, coin.to_era_id) }}</dd>

      <dt>Rok do</dt>
      <dd>{{ coin.to_year }}</dd>

      <dt>Mennica</dt>
      <dd>{{ dictionaryName(dictionaries.mints, coin.mint_id) }}</dd>

      <dt>Materiał</dt>
      <dd>{{ dictionaryName(dictionaries.materials, coin.material_id) }}</dd>

      <dt>Stan zachowania</dt>
      <dd>{{ dictionaryName(dictionaries.states, coin.state_id) }}</dd>

      <dt>Waga</dt>
      <dd>{{ coin.weight ?? '—' }} g</dd>

      <dt>Średnica</dt>
      <dd>{{ coin.diameter ?? '—' }} mm</dd>

      <dt>Wideo</dt>
      <dd>{{ coin.has_video ? 'Tak' : 'Nie' }}</dd>

      <dt>Źródło</dt>
      <dd>{{ coin.source ?? '—' }}</dd>

      <dt>Opis</dt>
      <dd>{{ coin.description ?? '—' }}</dd>

      <dt>Status</dt>
      <dd>{{ coin.is_deleted ? 'Zarchiwizowana' : 'Aktywna' }}</dd>
    </dl>

    <CoinCategoriesReadOnly :coin-id="coin.id" />
  </section>
</template>

<style scoped>
.primary-images {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.primary-image-card {
  width: 240px;
  margin: 0;
}

.primary-image-card img,
.primary-image-card .image-placeholder {
  display: block;
  width: 100%;
  height: 240px;
  object-fit: contain;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #f8fafc;
}

.primary-image-card .image-placeholder {
  display: grid;
  place-items: center;
}

.primary-image-card figcaption,
.additional-image-card figcaption {
  margin-top: 6px;
}

.additional-images {
  margin-bottom: 24px;
}

.additional-image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.additional-image-card {
  width: 160px;
  margin: 0;
}

.additional-image-card img {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: contain;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f8fafc;
}
</style>
