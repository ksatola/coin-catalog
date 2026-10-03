<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { Coin } from '../types'
import CoinImage from './CoinImage.vue'

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
  detailQuery?: string
  selectedIds?: number[]
}>()

const emit = defineEmits<{ toggleSelection: [id: number] }>()

function detailPath(coinId: number): string {
  return `/monety/${coinId}${props.detailQuery ? `?${props.detailQuery}` : ''}`
}

const dictionaries = ref<Dictionaries>({
  countries: [],
  issuers: [],
  denominations: [],
  mints: [],
  materials: [],
  states: [],
  eras: [],
})

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
    dictionaryName(dictionaries.value.materials, coin.material_id),
    dictionaryName(dictionaries.value.states, coin.state_id),
    coin.weight !== null ? `${Number(coin.weight).toFixed(2)} g` : null,
    coin.diameter !== null ? `${Number(coin.diameter).toFixed(2)} mm` : null,
  ].filter((value): value is string => Boolean(value))
}

async function loadDictionaries(): Promise<void> {
  const names: Array<keyof Dictionaries> = ['countries', 'issuers', 'denominations', 'mints', 'materials', 'states', 'eras']
  try {
    const results = await Promise.all(names.map(async (name) => {
      const response = await fetch(`/api/dictionaries/${name}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return [name, await response.json() as DictionaryItem[]] as const
    }))
    for (const [name, items] of results) dictionaries.value[name] = items
  } catch {
    // The grid remains usable with IDs/years if dictionary data is unavailable.
  }
}

function imageUrl(coin: Coin, kind: 'avers' | 'rewers'): string | undefined {
  const image = coin.images?.find((item) => item.kind === kind)
  return image ? `/api/coins/${coin.id}/images/${image.id}/thumbnail?v=${image.revision ?? 1}` : undefined
}

onMounted(() => void loadDictionaries())

</script>

<template>
  <div class="grid">
    <RouterLink
      v-for="coin in coins"
      :key="coin.id"
      class="card"
      :to="detailPath(coin.id)"
      :aria-label="`Moneta #${coin.id}`"
    >
      <label class="selection-toggle" @click.stop><input type="checkbox" :checked="props.selectedIds?.includes(coin.id)" :aria-label="'Wybierz monetę #' + coin.id" @change="emit('toggleSelection', coin.id)" /></label>
      <div class="image-row">
        <div class="coin-side">
          <CoinImage v-if="imageUrl(coin, 'avers')" :src="imageUrl(coin, 'avers')!" :alt="`Awers monety #${coin.id}`" loading="lazy" />
          <span v-else>Brak zdjęcia</span>
        </div>
        <div class="coin-side">
          <CoinImage v-if="imageUrl(coin, 'rewers')" :src="imageUrl(coin, 'rewers')!" :alt="`Rewers monety #${coin.id}`" loading="lazy" />
          <span v-else>Brak zdjęcia</span>
        </div>
      </div>

      <div class="coin-info">
        <div class="coin-meta">
          <strong>#{{ coin.id }} <span v-if="coin.collection_number" class="collection-number">|&nbsp;&nbsp;{{ coin.collection_number }}</span></strong>
          <span>{{ formatRange(coin) }}</span>
        </div>
        <div class="coin-line">
          <span>{{ dictionaryName(dictionaries.countries, coin.country_id) }}</span>
          <span v-if="dictionaryName(dictionaries.issuers, coin.issuer_id)">{{ dictionaryName(dictionaries.issuers, coin.issuer_id) }}</span>
        </div>
        <div class="coin-line">
          <span>{{ dictionaryName(dictionaries.denominations, coin.denomination_id) }}</span>
          <span v-if="dictionaryName(dictionaries.mints, coin.mint_id)">{{ dictionaryName(dictionaries.mints, coin.mint_id) }}</span>
        </div>
        <div class="coin-details">
          <span v-for="(detail, index) in formatDetails(coin)" :key="`${coin.id}-${index}`">{{ detail }}</span>
          <svg v-if="coin.has_video" class="video-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-label="Video" role="img">
            <rect x="3" y="6" width="13" height="12" rx="2" />
            <path d="m16 10 5-3v10l-5-3z" />
          </svg>
        </div>
      </div>
    </RouterLink>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: 16px; width: 100%; }
.selection-toggle{position:absolute;z-index:2;top:8px;left:8px;padding:5px;border-radius:6px;background:#fff}.card {position:relative; display: grid; min-width: 0; border: 1px solid #dbe3ee; border-radius: 10px; background: #ffffff; color: inherit; text-decoration: none; overflow: hidden; }
.image-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); min-height: 240px; background: #ffffff; }
.coin-side { display: grid; min-width: 0; min-height: 240px; padding: 20px 0; place-items: center; background: #ffffff; }
.coin-side + .coin-side { border-left: 1px solid #e2e8f0; }
.coin-side img { display: block; width: 100%; height: 200px; object-fit: contain; }
.coin-side span { color: #94a3b8; font-size: 13px; }
.coin-info { display: grid; gap: 6px; min-height: 128px; padding: 14px 16px 16px; border-top: 1px solid #e2e8f0; background: #ffffff; }
.coin-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.coin-meta strong { color: #0f172a; font-size: 16px; }
.collection-number { color: #64748b; font-size: 14px; font-weight: 600; }
.coin-meta > span { color: #64748b; font-size: 14px; white-space: nowrap; }
.coin-line, .coin-details { display: flex; flex-wrap: wrap; gap: 0; color: #475569; font-size: 14px; line-height: 1.45; }
.coin-line span + span::before, .coin-details span + span::before { content: '·'; margin-inline: 6px; color: #94a3b8; }
.coin-details { align-items: center; color: #64748b; }
.video-icon { width: 16px; height: 16px; margin-left: 8px; color: #64748b; flex: 0 0 auto; }
.card:hover { border-color: #94a3b8; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08); }
@media (max-width: 600px) { .grid { grid-template-columns: 1fr; } .coin-meta > span { white-space: normal; text-align: right; } }
</style>
