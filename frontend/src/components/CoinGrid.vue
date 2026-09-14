<script setup lang="ts">
import { onMounted, reactive } from 'vue'

import type { Coin, CoinImage } from '../types'

const props = defineProps<{
  coins: Coin[]
}>()

const aversImages = reactive<Record<number, CoinImage | null>>({})

async function loadAversImages(): Promise<void> {
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
        return [coin.id, images.find((image) => image.kind === 'avers') ?? null] as const
      } catch {
        return [coin.id, null] as const
      }
    }),
  )

  for (const [coinId, image] of results) {
    aversImages[coinId] = image
  }
}

function imageUrl(coin: Coin): string | undefined {
  const image = aversImages[coin.id]
  if (!image) {
    return undefined
  }

  return `/api/coins/${coin.id}/images/${image.id}/file`
}

onMounted(() => {
  void loadAversImages()
})
</script>

<template>
  <div class="grid">
    <RouterLink
      v-for="coin in coins"
      :key="coin.id"
      class="card"
      :to="`/monety/${coin.id}`"
    >
      <div class="image-container">
        <img
          v-if="aversImages[coin.id]"
          :src="imageUrl(coin)"
          :alt="`Awers monety #${coin.id}`"
        />
        <span v-else>Brak zdjęcia</span>
      </div>

      <strong>#{{ coin.id }}</strong>
      <span>{{ coin.from_year }}–{{ coin.to_year }}</span>

      <span v-if="coin.description">
        {{ coin.description }}
      </span>
    </RouterLink>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;

  padding: 12px;
  border: 1px solid #ccc;
  color: inherit;
  text-decoration: none;
}

.image-container {
  display: grid;
  min-height: 180px;
  place-items: center;
  background: #eee;
  overflow: hidden;
}

.image-container img {
  display: block;
  width: 100%;
  height: 180px;
  object-fit: contain;
}
</style>
