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
          <strong>#{{ coin.id }}</strong>
          <span>{{ coin.from_year }}–{{ coin.to_year }}</span>
        </div>
        <p v-if="coin.description">{{ coin.description }}</p>
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
  min-height: 92px;
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

.coin-meta span {
  color: #64748b;
  font-size: 14px;
}

.coin-info p {
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.45;
}

.card:hover {
  border-color: #94a3b8;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
