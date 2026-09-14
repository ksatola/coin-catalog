<script setup lang="ts">
import type { Coin } from '../types'

defineProps<{
  coins: Coin[]
}>()

const emit = defineEmits<{
  details: [coin: Coin]
  restore: [coin: Coin]
}>()
</script>

<template>
  <section>
    <h2>Archiwum</h2>

    <p v-if="coins.length === 0">Brak zarchiwizowanych monet.</p>

    <ul v-else>
      <li v-for="coin in coins" :key="coin.id">
        <span>
          #{{ coin.id }} — {{ coin.from_year }}–{{ coin.to_year }}
          <span v-if="coin.description"> — {{ coin.description }}</span>
        </span>

        <button type="button" @click="emit('details', coin)">
          Szczegóły
        </button>

        <button type="button" @click="emit('restore', coin)">
          Przywróć
        </button>
      </li>
    </ul>
  </section>
</template>
