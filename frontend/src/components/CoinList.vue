<script setup lang="ts">
import type { Coin } from '../types'

defineProps<{
  coins: Coin[]
}>()

const emit = defineEmits<{
  details: [coin: Coin]
  edit: [coin: Coin]
  archive: [coin: Coin]
}>()
</script>

<template>
  <section>
    <h2>Monety</h2>

    <p v-if="coins.length === 0">Brak monet w katalogu.</p>

    <ul v-else>
      <li v-for="coin in coins" :key="coin.id">
        <span>
          #{{ coin.id }} — {{ coin.from_year }}–{{ coin.to_year }}
          <span v-if="coin.description"> — {{ coin.description }}</span>
        </span>

        <button type="button" @click="emit('details', coin)">
          Szczegóły
        </button>

        <button type="button" @click="emit('edit', coin)">
          Edytuj
        </button>

        <button type="button" @click="emit('archive', coin)">
          Archiwizuj
        </button>
      </li>
    </ul>
  </section>
</template>
