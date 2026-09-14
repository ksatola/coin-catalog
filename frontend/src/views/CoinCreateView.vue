<script setup lang="ts">
import { useRouter } from 'vue-router'

import CoinForm from '../components/CoinForm.vue'
import type { CoinCreate } from '../types'

const router = useRouter()

async function createCoin(coinData: CoinCreate): Promise<void> {
  const response = await fetch('/api/coins', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(coinData),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const coin = await response.json()
  await router.push(`/monety/${coin.id}`)
}
</script>

<template>
  <section>
    <h1>Dodaj monetę</h1>
    <CoinForm @submit="createCoin" />
  </section>
</template>
