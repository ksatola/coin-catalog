<script setup lang="ts">
import type { Coin } from '../types'
import CoinImage from './CoinImage.vue'

type Scale = 25 | 50 | 75 | 100

const props = withDefaults(
  defineProps<{
    coins: Coin[]
    scale?: Scale
    detailQuery?: string
  }>(),
  {
    scale: 100,
  },
)

const BASE_COIN_SIZE = 400
const UNKNOWN_COIN_SIZE = 96

function detailPath(coinId: number): string {
  return `/monety/${coinId}${props.detailQuery ? `?${props.detailQuery}` : ''}`
}

function imageUrl(coin: Coin, kind: 'avers' | 'rewers'): string | undefined {
  const image = coin.images?.find((item) => item.kind === kind)
  return image ? `/api/coins/${coin.id}/images/${image.id}/file` : undefined
}

function maximumDiameter(): number {
  return props.coins.reduce((maximum, coin) => {
    const diameter = coin.diameter === null ? 0 : Number(coin.diameter)
    return Number.isFinite(diameter) && diameter > maximum ? diameter : maximum
  }, 0)
}

function renderedSize(coin: Coin): number {
  const diameter = coin.diameter === null ? null : Number(coin.diameter)
  const maximum = maximumDiameter()

  if (diameter === null || !Number.isFinite(diameter) || maximum <= 0) {
    return UNKNOWN_COIN_SIZE
  }

  return Math.max(1, BASE_COIN_SIZE * (diameter / maximum) * (props.scale / 100))
}

function coinStyle(coin: Coin): Record<string, string> {
  const size = renderedSize(coin)
  return {
    '--coin-size': `${size}px`,
  }
}
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
      <template v-if="coin.diameter !== null">
        <div v-if="imageUrl(coin, 'avers')" class="coin-side">
          <CoinImage
            :src="imageUrl(coin, 'avers')!"
            :alt="`Awers monety #${coin.id}`"
          />
        </div>
        <div v-if="imageUrl(coin, 'rewers')" class="coin-side">
          <CoinImage
            :src="imageUrl(coin, 'rewers')!"
            :alt="`Rewers monety #${coin.id}`"
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

.coin-size-tile {
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
