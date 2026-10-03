<script setup lang="ts">
import type { Coin } from '../types'
import CoinImage from './CoinImage.vue'

const props = defineProps<{
  coins: Coin[]
  columns?: 1 | 2 | 3 | 4
  selectedIds?: number[]
  detailQuery?: string
}>()

const emit = defineEmits<{ toggleSelection: [id: number] }>()

function detailPath(coinId: number): string {
  return `/monety/${coinId}${props.detailQuery ? `?${props.detailQuery}` : ''}`
}

function imageUrl(coin: Coin, kind: 'avers' | 'rewers'): string | undefined {
  const image = coin.images?.find((item) => item.kind === kind)
  return image ? `/api/coins/${coin.id}/images/${image.id}/thumbnail?v=${image.revision ?? 1}` : undefined
}
</script>

<template>
  <div
    class="image-grid"
    :style="{
      '--image-grid-columns': columns ?? 2,
      '--gallery-scale': 2 / (columns ?? 2),
    }"
  >
    <RouterLink
      v-for="coin in coins"
      :key="coin.id"
      class="coin-tile"
      :to="detailPath(coin.id)"
      :aria-label="`Moneta #${coin.id}`"
    >
      <label class="selection-toggle" @click.stop><input type="checkbox" :checked="props.selectedIds?.includes(coin.id)" :aria-label="'Wybierz monetę #' + coin.id" @change="emit('toggleSelection', coin.id)" /></label>
      <div class="coin-side">
        <CoinImage
          v-if="imageUrl(coin, 'avers')"
          :src="imageUrl(coin, 'avers')!"
          :alt="`Awers monety #${coin.id}`"
          loading="lazy"
        />
      </div>
      <div class="coin-side">
        <CoinImage
          v-if="imageUrl(coin, 'rewers')"
          :src="imageUrl(coin, 'rewers')!"
          :alt="`Rewers monety #${coin.id}`"
          loading="lazy"
        />
      </div>
    </RouterLink>
  </div>
</template>

<style scoped>
.image-grid {
  display: grid;
  grid-template-columns: repeat(var(--image-grid-columns), minmax(0, 1fr));
  gap: 16px;
  width: 100%;
}

.selection-toggle{position:absolute;z-index:2;top:8px;left:8px;padding:5px;border-radius:6px;background:#fff}.coin-tile {position:relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: calc(200px * var(--gallery-scale));
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
  text-decoration: none;
}

.coin-side {
  display: grid;
  min-width: 0;
  min-height: calc(240px * var(--gallery-scale));
  padding: calc(20px * var(--gallery-scale)) 0;
  place-items: center;
  background: #ffffff;
}

.coin-side + .coin-side {
  border-left: 1px solid #e2e8f0;
}

.coin-side img {
  display: block;
  width: 100%;
  height: calc(200px * var(--gallery-scale));
  object-fit: contain;
}

.coin-tile:hover {
  border-color: #94a3b8;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

@media (max-width: 900px) {
  .image-grid {
    grid-template-columns: repeat(min(var(--image-grid-columns), 2), minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .image-grid {
    grid-template-columns: 1fr;
  }
}
</style>
