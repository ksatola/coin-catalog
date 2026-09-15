<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'

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

const imagesByCoin = reactive<Record<number, CoinImages>>({})
const dictionaries = ref<Dictionaries>({
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
  const era = dictionaryName(dictionaries.value.eras, eraId)
  return era ? `${year} ${era}` : `${year}`
}

function formatRange(coin: Coin): string {
  return `${formatYear(coin.from_year, coin.from_era_id)} – ${formatYear(coin.to_year, coin.to_era_id)}`
}

function formatDetails(coin: Coin): string[] {
  return [
    dictionaryName(dictionaries.value.materials, coin.material_id),
    dictionaryName(dictionaries.value.states, coin.state_id),
    coin.weight !== null ? `${Number(coin.weight).toFixed(2)} g` : null,
    coin.diameter !== null ? `${Number(coin.diameter).toFixed(2)} mm` : null,
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
      dictionaries.value[name] = items
    }
  } catch {
    // The grid remains usable with IDs/years if dictionary data is unavailable.
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

onMounted(() => {
  void loadDictionaries()
})

watch(() => props.coins, () => {
  void loadImages()
}, { immediate: true })
</script>

<template>
  <div class="grid">
    <RouterLink
      v-for="coin in coins"
      :key="coin.id"
      class="card"
      :to="`/monety/${coin.id}`"
      :aria-label="`Moneta #${coin.id}`"
    >
      <div class="image-row">
        <div class="coin-side">
          <img
            v-if="imagesByCoin[coin.id]?.avers"
            :src="imageUrl(coin, 'avers')"
            :alt="`Awers monety #${coin.id}`"
          />
          <span v-else>Brak zdjęcia</span>
        </div>
        <div class="coin-side">
          <img
            v-if="imagesByCoin[coin.id]?.rewers"
            :src="imageUrl(coin, 'rewers')"
            :alt="`Rewers monety #${coin.id}`"
          />
          <span v-else>Brak zdjęcia</span>
        </div>
      </div>

      <div class="coin-info">
        <div class="coin-meta">
          <strong>#{{ coin.id }} <span class="collection-number">|&nbsp;&nbsp;KC-042</span></strong>
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
    </RouterLink>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr));
  gap: 16px;
  width: 100%;
}

.card {
  display: grid;
  min-width: 0;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: #ffffff;
  color: inherit;
  text-decoration: none;
  overflow: hidden;
}

.image-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 240px;
  background: #ffffff;
}

.coin-side {
  display: grid;
  min-width: 0;
  min-height: 240px;
  padding: 20px 0;
  place-items: center;
  background: #ffffff;
}

.coin-side + .coin-side {
  border-left: 1px solid #e2e8f0;
}

.coin-side img {
  display: block;
  width: 100%;
  height: 200px;
  object-fit: contain;
}

.coin-side span {
  color: #94a3b8;
  font-size: 13px;
}

.coin-info {
  display: grid;
  gap: 6px;
  min-height: 128px;
  padding: 14px 16px 16px;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
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

.collection-number {
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
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
  gap: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.45;
}

.coin-line span + span::before,
.coin-details span + span::before {
  content: ' · ';
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

.card:hover {
  border-color: #94a3b8;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .coin-meta > span {
    white-space: normal;
    text-align: right;
  }
}
</style>
