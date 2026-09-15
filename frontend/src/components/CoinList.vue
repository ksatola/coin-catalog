<script setup lang="ts">
import { onMounted, reactive } from 'vue'

import type { Coin, CoinImage } from '../types'

const props = defineProps<{
  coins: Coin[]
}>()

const emit = defineEmits<{
  details: [coin: Coin]
  archive: [coin: Coin]
  restore: [coin: Coin]
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
  <ul>
    <li v-for="coin in coins" :key="coin.id">
      <span class="coin-image">
        <img
          v-if="aversImages[coin.id]"
          :src="imageUrl(coin)"
          :alt="`Awers monety #${coin.id}`"
        />
        <span v-else>Brak zdjęcia</span>
      </span>

      <span>
        #{{ coin.id }} — {{ coin.from_year }}–{{ coin.to_year }}
        <span v-if="coin.description"> — {{ coin.description }}</span>
      </span>

      <button type="button" @click="emit('details', coin)">
        Szczegóły
      </button>

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
    </li>
  </ul>
</template>

<style scoped>
li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.coin-image {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  flex: 0 0 64px;
  background: #eee;
  overflow: hidden;
}

.coin-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
