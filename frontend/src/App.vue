<script setup lang="ts">
import { onMounted, ref } from 'vue'

import CoinForm from './components/CoinForm.vue'
import CoinList from './components/CoinList.vue'
import DictionaryEditor from './components/DictionaryEditor.vue'
import type { Coin, CoinCreate } from './types'

const coins = ref<Coin[]>([])
const errorMessage = ref('')

async function loadCoins(): Promise<void> {
  try {
    const response = await fetch('/api/coins')

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    coins.value = await response.json() as Coin[]
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać monet.'
  }
}

async function createCoin(coinData: CoinCreate): Promise<void> {
  try {
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

    await loadCoins()
  } catch {
    errorMessage.value = 'Nie udało się zapisać monety.'
  }
}

onMounted(loadCoins)
</script>

<template>
  <main>
    <h1>Coin Catalog</h1>

    <DictionaryEditor />

    <CoinForm @submit="createCoin" />

    <p v-if="errorMessage">{{ errorMessage }}</p>

    <CoinList :coins="coins" />
  </main>
</template>
