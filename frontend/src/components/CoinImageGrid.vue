<script setup lang="ts">
import { reactive, watch } from 'vue'

import type { Coin, CoinImage } from '../types'

type CoinImages = {
  avers: CoinImage | null
  rewers: CoinImage | null
}

const props = defineProps<{
  coins: Coin[]
}>()

const imagesByCoin = reactive<Record<number, CoinImages>>({})
let loadGeneration = 0

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

watch(() => props.coins, () => {
  void loadImages()
}, { immediate: true })
</script>

<template>
  <div class="image-grid">
    <RouterLink
      v-for="coin in coins"
      :key="coin.id"
      class="coin-tile"
      :to="`/monety/${coin.id}`"
      :aria-label="`Moneta #${coin.id}`"
    >
      <div class="coin-side">
        <img
          v-if="imagesByCoin[coin.id]?.avers"
          :src="imageUrl(coin, 'avers')"
          :alt="`Awers monety #${coin.id}`"
        />
      </div>
      <div class="coin-side">
        <img
          v-if="imagesByCoin[coin.id]?.rewers"
          :src="imageUrl(coin, 'rewers')"
          :alt="`Rewers monety #${coin.id}`"
        />
      </div>
    </RouterLink>
  </div>
</template>

<style scoped>
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr));
  gap: 16px;
  width: 100%;
}

.coin-tile {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 200px;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
  text-decoration: none;
}

.coin-side {
  display: grid;
  min-width: 0;
  min-height: 200px;
  place-items: center;
  background: #f1f5f9;
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

.coin-tile:hover {
  border-color: #94a3b8;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

@media (max-width: 600px) {
  .image-grid {
    grid-template-columns: 1fr;
  }
}
</style>
