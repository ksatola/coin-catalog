<script setup lang="ts">
import { reactive, watch } from 'vue'

import type { Coin, CoinImage } from '../types'

type CoinImages = {
  avers: CoinImage | null
  rewers: CoinImage | null
}

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
  coins: Coin[]
}>()

const emit = defineEmits<{
  details: [coin: Coin]
  archive: [coin: Coin]
  restore: [coin: Coin]
}>()

const imagesByCoin = reactive<Record<number, CoinImages>>({})
const dictionaries = reactive<Dictionaries>({
  countries: [],
  issuers: [],
  denominations: [],
  mints: [],
  materials: [],
  states: [],
  eras: [],
})
let loadGeneration = 0

function dictionaryName(items: DictionaryItem[], id: number | null): string | null {
  if (id === null) {
    return null
  }

  return items.find((item) => item.id === id)?.name ?? null
}

function formatYear(year: number, eraId: number): string {
  const era = dictionaryName(dictionaries.eras, eraId)
  return era ? `${year} ${era}` : `${year}`
}

function formatRange(coin: Coin): string {
  return `${formatYear(coin.from_year, coin.from_era_id)} – ${formatYear(coin.to_year, coin.to_era_id)}`
}

function formatDetails(coin: Coin): string[] {
  return [
    dictionaryName(dictionaries.materials, coin.material_id),
    dictionaryName(dictionaries.states, coin.state_id),
    coin.weight !== null ? `${coin.weight.toFixed(2)} g` : null,
    coin.diameter !== null ? `${coin.diameter.toFixed(2)} mm` : null,
  ].filter((value): value is string => Boolean(value))
}

async function loadDictionaries(): Promise<void> {
  const names: Array<keyof Dictionaries> = [
    'countries',
    'issuers',
    'denominations',
    'mints',
    'materials',
    'states',
    'eras',
  ]

  try {
    const results = await Promise.all(
      names.map(async (name) => {
        const response = await fetch(`/api/dictionaries/${name}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return [name, await response.json() as DictionaryItem[]] as const
      }),
    )

    for (const [name, items] of results) {
      dictionaries[name] = items
    }
  } catch {
    // The list remains usable with IDs and years if dictionary data is unavailable.
  }
}

async function loadImages(): Promise<void> {
  const generation = ++loadGeneration
  const coinIds = new Set(props.coins.map((coin) => coin.id))

  for (const coinId of Object.keys(imagesByCoin)) {
    if (!coinIds.has(Number(coinId))) {
      delete imagesByCoin[Number(coinId)]
    }
  }

  const results = await Promise.all(
    props.coins.map(async (coin) => {
      try {
        const response = await fetch(`/api/coins/${coin.id}/images`, {
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const images = await response.json() as CoinImage[]
        return [
          coin.id,
          {
            avers: images.find((image) => image.kind === 'avers') ?? null,
            rewers: images.find((image) => image.kind === 'rewers') ?? null,
          },
        ] as const
      } catch {
        return [coin.id, { avers: null, rewers: null }] as const
      }
    }),
  )

  if (generation !== loadGeneration) {
    return
  }

  for (const [coinId, images] of results) {
    if (coinIds.has(coinId)) {
      imagesByCoin[coinId] = images
    }
  }
}

function imageUrl(coin: Coin, kind: 'avers' | 'rewers'): string | undefined {
  const image = imagesByCoin[coin.id]?.[kind]
  if (!image) {
    return undefined
  }

  return `/api/coins/${coin.id}/images/${image.id}/file`
}

void loadDictionaries()

watch(() => props.coins, () => {
  void loadImages()
}, { immediate: true })
</script>

<template>
  <ul class="coin-list">
    <li v-for="coin in coins" :key="coin.id" class="coin-row">
      <div class="image-pair">
        <span class="coin-image">
          <img
            v-if="imagesByCoin[coin.id]?.avers"
            :src="imageUrl(coin, 'avers')"
            :alt="`Awers monety #${coin.id}`"
          />
          <span v-else>Brak zdjęcia</span>
        </span>
        <span class="coin-image">
          <img
            v-if="imagesByCoin[coin.id]?.rewers"
            :src="imageUrl(coin, 'rewers')"
            :alt="`Rewers monety #${coin.id}`"
          />
          <span v-else>Brak zdjęcia</span>
        </span>
      </div>

      <div class="coin-info">
        <div class="coin-meta">
          <strong>#{{ coin.id }} | KC-042</strong>
          <span>{{ formatRange(coin) }}</span>
        </div>
        <div class="coin-line">
          <span>{{ dictionaryName(dictionaries.countries, coin.country_id) }}</span>
          <span v-if="dictionaryName(dictionaries.issuers, coin.issuer_id)">
            {{ dictionaryName(dictionaries.issuers, coin.issuer_id) }}
          </span>
        </div>
        <div class="coin-line">
          <span>{{ dictionaryName(dictionaries.denominations, coin.denomination_id) }}</span>
          <span v-if="dictionaryName(dictionaries.mints, coin.mint_id)">
            {{ dictionaryName(dictionaries.mints, coin.mint_id) }}
          </span>
        </div>
        <div class="coin-details">
          <span v-for="(detail, index) in formatDetails(coin)" :key="`${coin.id}-${index}`">
            {{ detail }}
          </span>
          <svg
            v-if="coin.has_video"
            class="video-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-label="Video"
            role="img"
          >
            <rect x="3" y="6" width="13" height="12" rx="2" />
            <path d="m16 10 5-3v10l-5-3z" />
          </svg>
        </div>
      </div>

      <div class="actions">
        <button type="button" @click="emit('details', coin)">
          Szczegóły
        </button>
        <RouterLink class="button" :to="`/monety/${coin.id}/edytuj`">
          Edytuj
        </RouterLink>
        <button
          v-if="!coin.is_deleted"
          type="button"
          @click="emit('archive', coin)"
        >
          Archiwizuj
        </button>
        <button
          v-else
          type="button"
          @click="emit('restore', coin)"
        >
          Przywróć
        </button>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.coin-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.coin-row {
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: #ffffff;
}

.image-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.coin-image {
  display: grid;
  width: 88px;
  height: 88px;
  min-width: 0;
  place-items: center;
  background: #ffffff;
  overflow: hidden;
}

.coin-image + .coin-image {
  border-left: 1px solid #e2e8f0;
}

.coin-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.coin-image span {
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
}

.coin-info {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.coin-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.coin-meta strong {
  color: #0f172a;
  font-size: 16px;
}

.coin-meta > span {
  color: #64748b;
  font-size: 14px;
  white-space: nowrap;
}

.coin-line,
.coin-details {
  display: flex;
  flex-wrap: wrap;
  color: #475569;
  font-size: 14px;
  line-height: 1.45;
}

.coin-line span + span,
.coin-details span + span {
  margin-left: 0.35em;
}

.coin-line span + span::before,
.coin-details span + span::before {
  content: '·';
  margin-right: 0.35em;
  color: #94a3b8;
}

.coin-details {
  align-items: center;
  color: #64748b;
}

.video-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
  color: #64748b;
  flex: 0 0 auto;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.actions button,
.actions .button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #334155;
  font: inherit;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
}

.actions button:hover,
.actions .button:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

@media (max-width: 900px) {
  .coin-row {
    grid-template-columns: 144px minmax(0, 1fr);
  }

  .image-pair {
    grid-row: span 2;
  }

  .coin-image {
    width: 72px;
    height: 72px;
  }

  .actions {
    grid-column: 2;
    justify-content: flex-start;
  }
}

@media (max-width: 600px) {
  .coin-row {
    grid-template-columns: 1fr;
  }

  .image-pair {
    grid-row: auto;
  }

  .coin-image {
    width: 100%;
    height: 120px;
  }

  .coin-meta > span {
    white-space: normal;
    text-align: right;
  }

  .actions {
    grid-column: auto;
  }
}
</style>
