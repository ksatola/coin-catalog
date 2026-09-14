<script setup lang="ts">
import type { Coin } from '../types'

defineProps<{
  coins: Coin[]
}>()
</script>

<template>
  <section>
    <h2>Monety</h2>

    <p v-if="coins.length === 0">Brak monet w katalogu.</p>

    <ul v-else>
      <li v-for="coin in coins" :key="coin.id">
        #{{ coin.id }} — {{ coin.from_year }}–{{ coin.to_year }}
        <span v-if="coin.description"> — {{ coin.description }}</span>
      </li>
    </ul>
  </section>
</template>
