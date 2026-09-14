<script setup lang="ts">
import type { Coin } from '../types'

withDefaults(
  defineProps<{
    coins: Coin[]
    archived?: boolean
  }>(),
  {
    archived: false,
  },
)

const emit = defineEmits<{
  details: [coin: Coin]
  archive: [coin: Coin]
  restore: [coin: Coin]
}>()
</script>

<template>
  <ul>
    <li v-for="coin in coins" :key="coin.id">
      <span>
        #{{ coin.id }} — {{ coin.from_year }}–{{ coin.to_year }}
        <span v-if="coin.description"> — {{ coin.description }}</span>
      </span>

      <button type="button" @click="emit('details', coin)">
        Szczegóły
      </button>

      <button
        v-if="!archived"
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
