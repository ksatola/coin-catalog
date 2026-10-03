<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Coin } from '../types'
import CoinImage from './CoinImage.vue'

const props = defineProps<{
  id: number
  coin: Coin | null
  deleted: boolean
}>()

const avers = computed(() => props.coin?.images?.find((image) => image.kind === 'avers'))
const rewers = computed(() => props.coin?.images?.find((image) => image.kind === 'rewers'))

function imageUrl(imageId: number, revision?: number): string {
  return `/api/coins/${props.id}/images/${imageId}/thumbnail?v=${revision ?? 1}`
}
</script>

<template>
  <div v-if="deleted || !coin" class="story-coin-deleted">
    <strong>⚠ Moneta została usunięta</strong>
    <span>ID: {{ id }}</span>
  </div>

  <RouterLink
    v-else
    class="story-coin"
    :to="`/monety/${id}`"
    :aria-label="`Moneta #${id}`"
  >
    <div class="story-coin-images">
      <CoinImage
        v-if="avers"
        :src="imageUrl(avers.id, avers.revision)"
        :alt="`Awers monety #${id}`"
      />
      <CoinImage
        v-if="rewers"
        :src="imageUrl(rewers.id, rewers.revision)"
        :alt="`Rewers monety #${id}`"
      />
    </div>
    <div class="story-coin-caption">
      <strong>Moneta #{{ id }}</strong>
      <span v-if="coin.collection_number">Nr {{ coin.collection_number }}</span>
      <span v-if="coin.from_year || coin.to_year">
        {{ coin.from_year ?? '?' }}–{{ coin.to_year ?? '?' }}
      </span>
    </div>
  </RouterLink>
</template>

<style scoped>
.story-coin,
.story-coin-deleted {
  display: inline-flex;
  vertical-align: middle;
  margin: 6px 4px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #fff;
}

.story-coin {
  min-width: 220px;
  flex-direction: column;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
}

.story-coin:hover {
  border-color: #94a3b8;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.story-coin-images {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 120px;
  background: #f8fafc;
}

.story-coin-images img {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: contain;
}

.story-coin-caption {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
}

.story-coin-caption span {
  color: #64748b;
  font-size: 0.9em;
}

.story-coin-deleted {
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  color: #7f1d1d;
  background: #fef2f2;
  border-color: #fecaca;
}
</style>
