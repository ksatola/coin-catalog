<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

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
const selectedImageIndex = ref<number | null>(null)

const allImages = computed<CoinImage[]>(() => {
  return [
    primaryImages.avers,
    primaryImages.rewers,
    ...additionalImages.value,
  ].filter((image): image is CoinImage => image !== null)
})

const selectedImage = computed(() => {
  if (selectedImageIndex.value === null) {
    return null
  }

  return allImages.value[selectedImageIndex.value] ?? null
})

function dictionaryName(
  items: DictionaryItem[],
  id: number | null,
): string {
  if (id === null) {
    return '—'
  }

  return items.find((item) => item.id === id)?.name ?? `#${id}`
}

function formatYear(year: number, eraId: number): string {
  const era = dictionaryName(dictionaries.eras, eraId)
  return `${year} ${era === '—' ? '' : era}`.trim()
}

function formatDateRange(): string {
  return `${formatYear(props.coin.from_year, props.coin.from_era_id)} – ${formatYear(props.coin.to_year, props.coin.to_era_id)}`
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

function openImage(image: CoinImage): void {
  const index = allImages.value.findIndex((item) => item.id === image.id)
  selectedImageIndex.value = index >= 0 ? index : null
}

function closeImage(): void {
  selectedImageIndex.value = null
}

function showPreviousImage(): void {
  if (selectedImageIndex.value === null || allImages.value.length < 2) {
    return
  }

  selectedImageIndex.value =
    (selectedImageIndex.value - 1 + allImages.value.length) % allImages.value.length
}

function showNextImage(): void {
  if (selectedImageIndex.value === null || allImages.value.length < 2) {
    return
  }

  selectedImageIndex.value =
    (selectedImageIndex.value + 1) % allImages.value.length
}

function handleViewerKeydown(event: KeyboardEvent): void {
  if (selectedImageIndex.value === null) {
    return
  }

  if (event.key === 'Escape') {
    closeImage()
  } else if (event.key === 'ArrowLeft') {
    showPreviousImage()
  } else if (event.key === 'ArrowRight') {
    showNextImage()
  }
}

onMounted(() => {
  void loadDictionaries()
  void loadImages()
  window.addEventListener('keydown', handleViewerKeydown)
})
</script>

<template>
  <section class="coin-detail">
    <h1>Szczegóły monety #{{ coin.id }}</h1>

    <p v-if="imageErrorMessage" class="image-error">{{ imageErrorMessage }}</p>

    <div class="primary-images">
      <figure class="primary-image-card" @click="primaryImages.avers && openImage(primaryImages.avers)">
        <button
          v-if="primaryImages.avers"
          type="button"
          class="image-button"
          @click.stop="openImage(primaryImages.avers)"
        >
          <img
            :src="imageUrl(primaryImages.avers)"
            alt="Awers monety"
          />
        </button>
        <div v-else class="image-placeholder">Brak zdjęcia awersu</div>
        <figcaption>Awers</figcaption>
      </figure>

      <figure class="primary-image-card" @click="primaryImages.rewers && openImage(primaryImages.rewers)">
        <button
          v-if="primaryImages.rewers"
          type="button"
          class="image-button"
          @click.stop="openImage(primaryImages.rewers)"
        >
          <img
            :src="imageUrl(primaryImages.rewers)"
            alt="Rewers monety"
          />
        </button>
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
          <button type="button" class="image-button" @click="openImage(image)">
            <img :src="imageUrl(image)" :alt="image.filename" />
          </button>
          <figcaption :title="image.filename">{{ image.filename }}</figcaption>
        </figure>
      </div>
    </div>

    <section class="details-section">
      <h2>Informacje</h2>
      <dl class="details-grid">
        <div class="detail-item">
          <dt>Kraj</dt>
          <dd>{{ dictionaryName(dictionaries.countries, coin.country_id) }}</dd>
        </div>
        <div class="detail-item">
          <dt>Emitent</dt>
          <dd>{{ dictionaryName(dictionaries.issuers, coin.issuer_id) }}</dd>
        </div>
        <div class="detail-item">
          <dt>Nominał</dt>
          <dd>{{ dictionaryName(dictionaries.denominations, coin.denomination_id) }}</dd>
        </div>
        <div class="detail-item">
          <dt>Mennica</dt>
          <dd>{{ dictionaryName(dictionaries.mints, coin.mint_id) }}</dd>
        </div>
        <div class="detail-item detail-item-wide">
          <dt>Datowanie</dt>
          <dd>{{ formatDateRange() }}</dd>
        </div>
        <div class="detail-item">
          <dt>Materiał</dt>
          <dd>{{ dictionaryName(dictionaries.materials, coin.material_id) }}</dd>
        </div>
        <div class="detail-item">
          <dt>Stan zachowania</dt>
          <dd>{{ dictionaryName(dictionaries.states, coin.state_id) }}</dd>
        </div>
        <div class="detail-item">
          <dt>Waga</dt>
          <dd>{{ coin.weight !== null ? `${Number(coin.weight).toFixed(2)} g` : '—' }}</dd>
        </div>
        <div class="detail-item">
          <dt>Średnica</dt>
          <dd>{{ coin.diameter !== null ? `${Number(coin.diameter).toFixed(2)} mm` : '—' }}</dd>
        </div>
        <div class="detail-item">
          <dt>Wideo</dt>
          <dd>{{ coin.has_video ? 'Tak' : 'Nie' }}</dd>
        </div>
        <div class="detail-item">
          <dt>Status</dt>
          <dd>{{ coin.is_deleted ? 'Zarchiwizowana' : 'Aktywna' }}</dd>
        </div>
      </dl>
    </section>

    <section class="text-section">
      <div>
        <h2>Źródło</h2>
        <p>{{ coin.source ?? '—' }}</p>
      </div>
      <div>
        <h2>Opis</h2>
        <p>{{ coin.description ?? '—' }}</p>
      </div>
    </section>

    <CoinCategoriesReadOnly :coin-id="coin.id" />

    <div
      v-if="selectedImage"
      class="image-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Podgląd zdjęcia"
      @click.self="closeImage"
    >
      <button type="button" class="viewer-close" aria-label="Zamknij" @click="closeImage">
        ×
      </button>

      <button
        v-if="allImages.length > 1"
        type="button"
        class="viewer-nav viewer-prev"
        aria-label="Poprzednie zdjęcie"
        @click="showPreviousImage"
      >
        ‹
      </button>

      <figure class="viewer-content">
        <div class="viewer-image-frame">
          <img
            :key="selectedImage.id"
            :src="imageUrl(selectedImage)"
            :alt="selectedImage.filename"
          />
          <figcaption>
            <span>{{ selectedImage.filename }}</span>
            <span v-if="allImages.length > 1">{{ (selectedImageIndex ?? 0) + 1 }} / {{ allImages.length }}</span>
          </figcaption>
        </div>
      </figure>

      <button
        v-if="allImages.length > 1"
        type="button"
        class="viewer-nav viewer-next"
        aria-label="Następne zdjęcie"
        @click="showNextImage"
      >
        ›
      </button>
    </div>
  </section>
</template>

<style scoped>
.coin-detail {
  display: grid;
  gap: 28px;
}

.coin-detail h1,
.coin-detail h2,
.coin-detail p {
  margin: 0;
}

.coin-detail h1 {
  color: #0f172a;
  font-size: 28px;
  line-height: 1.2;
}

.coin-detail h2 {
  margin-bottom: 12px;
  color: #0f172a;
  font-size: 20px;
}

.image-error {
  color: #b91c1c;
}

.primary-images {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.primary-image-card {
  min-width: 0;
  margin: 0;
  padding: 12px;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: #ffffff;
}

.image-button {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: zoom-in;
}

.primary-image-card img,
.primary-image-card .image-placeholder {
  display: block;
  width: 100%;
  height: min(52vw, 520px);
  min-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  background: #ffffff;
}

.primary-image-card .image-placeholder {
  display: grid;
  place-items: center;
  color: #64748b;
}

.primary-image-card figcaption,
.additional-image-card figcaption {
  margin-top: 8px;
  color: #475569;
  font-size: 13px;
}

.additional-images {
  min-width: 0;
}

.additional-image-list {
  display: flex;
  gap: 12px;
  min-width: 0;
  overflow-x: auto;
  padding: 2px 2px 8px;
}

.additional-image-card {
  flex: 0 0 88px;
  width: 88px;
  margin: 0;
}

.additional-image-card .image-button {
  overflow: hidden;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #ffffff;
}

.additional-image-card img {
  display: block;
  width: 88px;
  height: 88px;
  object-fit: contain;
  background: #f8fafc;
}

.additional-image-card figcaption {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.details-section {
  padding-top: 4px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
}

.detail-item {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.detail-item:nth-child(odd) {
  border-right: 1px solid #e2e8f0;
}

.detail-item dt {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-item dd {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 500;
}

.detail-item-wide {
  grid-column: 1 / -1;
  border-right: 0 !important;
}

.text-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.text-section > div {
  padding: 16px;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: #ffffff;
}

.text-section p {
  color: #475569;
  line-height: 1.6;
  white-space: pre-wrap;
}

.image-viewer {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 48px 72px;
  background: rgba(15, 23, 42, 0.92);
}

.viewer-content {
  display: flex;
  width: min(100%, 1400px);
  max-height: calc(100vh - 96px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0;
}

.viewer-image-frame {
  display: flex;
  width: fit-content;
  max-width: 100%;
  flex-direction: column;
  align-items: stretch;
}

.viewer-image-frame img {
  display: block;
  width: auto;
  height: auto;
  max-width: calc(100vw - 144px);
  max-height: calc(100vh - 156px);
  object-fit: contain;
}

.viewer-image-frame figcaption {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex: 0 0 auto;
  justify-content: space-between;
  gap: 16px;
  color: #e2e8f0;
  font-size: 13px;
}

.viewer-close,
.viewer-nav {
  position: fixed;
  z-index: 1001;
  border: 0;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
}

.viewer-close {
  top: 16px;
  right: 20px;
  font-size: 36px;
  line-height: 1;
}

.viewer-nav {
  top: 50%;
  width: 48px;
  height: 64px;
  margin-top: -32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 42px;
  line-height: 1;
}

.viewer-prev {
  left: 16px;
}

.viewer-next {
  right: 16px;
}

.viewer-close:hover,
.viewer-nav:hover {
  background: rgba(255, 255, 255, 0.2);
}

@media (max-width: 700px) {
  .primary-images,
  .details-grid,
  .text-section {
    grid-template-columns: 1fr;
  }

  .primary-image-card img,
  .primary-image-card .image-placeholder {
    height: 72vw;
    min-height: 240px;
  }

  .detail-item,
  .detail-item:nth-child(odd) {
    border-right: 0;
  }

  .detail-item-wide {
    grid-column: auto;
  }

  .image-viewer {
    padding: 48px 16px 32px;
  }

  .viewer-content {
    max-height: calc(100vh - 80px);
  }

  .viewer-image-frame img {
    max-width: calc(100vw - 72px);
    max-height: calc(100vh - 136px);
  }

  .viewer-nav {
    width: 40px;
    height: 52px;
    margin-top: -26px;
  }

  .viewer-prev {
    left: 8px;
  }

  .viewer-next {
    right: 8px;
  }
}
</style>
