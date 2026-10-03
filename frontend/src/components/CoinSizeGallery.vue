<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { Coin } from '../types'
import CoinImage from './CoinImage.vue'

type Scale = 25 | 50 | 75 | 100 | 125 | 150 | 200

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

const props = withDefaults(
  defineProps<{
    coins: Coin[]
    scale?: Scale
    pixelsPerMm?: number
    detailQuery?: string
    selectedIds?: number[]
  }>(),
  {
    scale: 100,
    pixelsPerMm: 96 / 25.4,
  },
)

const emit = defineEmits<{ toggleSelection: [id: number] }>()

const UNKNOWN_COIN_SIZE = 96

const dictionaries = ref<Dictionaries>({
  countries: [],
  issuers: [],
  denominations: [],
  mints: [],
  materials: [],
  states: [],
  eras: [],
})

function detailPath(coinId: number): string {
  return `/monety/${coinId}${props.detailQuery ? `?${props.detailQuery}` : ''}`
}

function imageUrl(coin: Coin, kind: 'avers' | 'rewers'): string | undefined {
  const image = coin.images?.find((item) => item.kind === kind)
  return image ? `/api/coins/${coin.id}/images/${image.id}/thumbnail?v=${image.revision ?? 1}` : undefined
}

function dictionaryName(items: DictionaryItem[], id: number | null): string | null {
  if (id === null) return null
  return items.find((item) => item.id === id)?.name ?? null
}

function formatYear(year: number | null, eraId: number | null): string {
  if (year === null) return '—'
  const era = dictionaryName(dictionaries.value.eras, eraId)
  return era ? `${year} ${era}` : `${year}`
}

function formatRange(coin: Coin): string {
  return `${formatYear(coin.from_year, coin.from_era_id)} – ${formatYear(coin.to_year, coin.to_era_id)}`
}

function formatDetails(coin: Coin): string[] {
  return [
    dictionaryName(dictionaries.value.materials, coin.material_id) ? `Materiał: ${dictionaryName(dictionaries.value.materials, coin.material_id)}` : null,
    dictionaryName(dictionaries.value.states, coin.state_id) ? `Stan: ${dictionaryName(dictionaries.value.states, coin.state_id)}` : null,
    coin.weight !== null ? `Waga: ${Number(coin.weight).toFixed(2)} g` : null,
    coin.diameter !== null ? `Średnica: ${Number(coin.diameter).toFixed(2)} mm` : null,
  ].filter((value): value is string => Boolean(value))
}

function tooltipLines(coin: Coin): string[] {
  const lines = [
    `#${coin.id}${coin.collection_number ? ` | ${coin.collection_number}` : ''}`,
    formatRange(coin),
    dictionaryName(dictionaries.value.countries, coin.country_id) ? `Kraj: ${dictionaryName(dictionaries.value.countries, coin.country_id)}` : null,
    dictionaryName(dictionaries.value.issuers, coin.issuer_id) ? `Emitent: ${dictionaryName(dictionaries.value.issuers, coin.issuer_id)}` : null,
    dictionaryName(dictionaries.value.denominations, coin.denomination_id) ? `Nominał: ${dictionaryName(dictionaries.value.denominations, coin.denomination_id)}` : null,
    dictionaryName(dictionaries.value.mints, coin.mint_id) ? `Mennica: ${dictionaryName(dictionaries.value.mints, coin.mint_id)}` : null,
    ...formatDetails(coin),
  ].filter(Boolean)

  if (coin.has_video) lines.push('Video')

  return lines.filter((value): value is string => Boolean(value))
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
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return [name, await response.json() as DictionaryItem[]] as const
      }),
    )

    for (const [name, items] of results) dictionaries.value[name] = items
  } catch {
    // The gallery remains usable with IDs/years if dictionary data is unavailable.
  }
}

function renderedSize(coin: Coin): number {
  const diameter = coin.diameter === null ? null : Number(coin.diameter)
  if (diameter === null || !Number.isFinite(diameter) || diameter <= 0) {
    return Math.max(1, UNKNOWN_COIN_SIZE * (props.scale / 100))
  }

  return Math.max(1, diameter * props.pixelsPerMm * (props.scale / 100))
}

function coinStyle(coin: Coin): Record<string, string> {
  const size = renderedSize(coin)
  return {
    '--coin-size': `${size}px`,
  }
}

onMounted(() => void loadDictionaries())
</script>

<template>
  <div class="size-gallery">
    <RouterLink
      v-for="coin in coins"
      :key="coin.id"
      class="coin-size-tile"
      :style="coinStyle(coin)"
      :to="detailPath(coin.id)"
      :aria-label="`Moneta #${coin.id}`"
    >
      <label class="selection-toggle" @click.stop><input type="checkbox" :checked="props.selectedIds?.includes(coin.id)" :aria-label="'Wybierz monetę #' + coin.id" @change="emit('toggleSelection', coin.id)" /></label>
      <div class="coin-tooltip" role="tooltip">
        <div v-for="(line, index) in tooltipLines(coin)" :key="`${coin.id}-tooltip-${index}`">
          {{ line }}
        </div>
      </div>
      <template v-if="coin.diameter !== null">
        <div v-if="imageUrl(coin, 'avers')" class="coin-side">
          <CoinImage
            :src="imageUrl(coin, 'avers')!"
            :alt="`Awers monety #${coin.id}`"
            loading="lazy"
          />
        </div>
        <div v-if="imageUrl(coin, 'rewers')" class="coin-side">
          <CoinImage
            :src="imageUrl(coin, 'rewers')!"
            :alt="`Rewers monety #${coin.id}`"
            loading="lazy"
          />
        </div>
        <div
          v-if="!imageUrl(coin, 'avers') && !imageUrl(coin, 'rewers')"
          class="missing-image"
          aria-label="Brak zdjęcia"
        >
          Brak zdjęcia
        </div>
      </template>

      <div v-else class="unknown-diameter">
        <strong>Ø?</strong>
        <span>Brak średnicy</span>
      </div>
    </RouterLink>
  </div>
</template>

<style scoped>
.size-gallery {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  width: 100%;
}

.selection-toggle{position:absolute;z-index:2;top:8px;left:8px;padding:4px;border-radius:6px;background:#fff}.coin-size-tile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: #ffffff;
  text-decoration: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.coin-size-tile:hover {
  border-color: #94a3b8;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.coin-tooltip {
  position: absolute;
  z-index: 20;
  bottom: calc(100% + 8px);
  left: 50%;
  display: grid;
  min-width: 220px;
  max-width: 360px;
  gap: 2px;
  padding: 9px 11px;
  border: 1px solid #dbe3ee;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, 4px);
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.coin-tooltip::after {
  position: absolute;
  bottom: -5px;
  left: 50%;
  width: 9px;
  height: 9px;
  border-right: 1px solid #dbe3ee;
  border-bottom: 1px solid #dbe3ee;
  background: #ffffff;
  content: '';
  transform: translateX(-50%) rotate(45deg);
}

.coin-size-tile:hover .coin-tooltip,
.coin-size-tile:focus-visible .coin-tooltip {
  opacity: 1;
  transform: translate(-50%, 0);
}

.coin-side,
.missing-image {
  display: grid;
  width: var(--coin-size);
  height: var(--coin-size);
  min-width: var(--coin-size);
  min-height: var(--coin-size);
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: #f8fafc;
}

.coin-side img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.coin-side + .coin-side {
  border-left: 1px solid #e2e8f0;
}

.missing-image {
  padding: 12px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

.unknown-diameter {
  display: grid;
  width: var(--coin-size);
  height: var(--coin-size);
  min-width: var(--coin-size);
  min-height: var(--coin-size);
  place-items: center;
  align-content: center;
  gap: 4px;
  border: 2px dashed #94a3b8;
  border-radius: 50%;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
}

.unknown-diameter strong {
  color: #475569;
  font-size: 22px;
}

.unknown-diameter span {
  max-width: 80px;
  font-size: 11px;
  line-height: 1.2;
}

@media (max-width: 600px) {
  .size-gallery {
    gap: 12px;
  }

  .coin-size-tile {
    max-width: 100%;
    overflow-x: auto;
  }
}
</style>
