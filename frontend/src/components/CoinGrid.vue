<script setup lang="ts">
import type { Coin } from '../types'

defineProps<{
  coins: Coin[]
}>()
</script>

<template>
  <div class="grid">
    <RouterLink
      v-for="coin in coins"
      :key="coin.id"
      class="card"
      :to="`/monety/${coin.id}`"
    >
      <div class="image-placeholder">
        Brak zdjęcia
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

.image-placeholder {
  display: grid;
  min-height: 180px;
  place-items: center;
  background: #eee;
}
</style>
