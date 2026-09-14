<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CoinForm from '../components/CoinForm.vue'
import type { Coin, CoinCreate } from '../types'

const route = useRoute()
const router = useRouter()

const coin = ref<Coin | null>(null)
const errorMessage = ref('')

async function loadCoin(): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${route.params.id}`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    coin.value = await response.json() as Coin
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać monety.'
  }
}

async function saveCoin(coinData: CoinCreate): Promise<void> {
  if (!coin.value) return

  try {
    const response = await fetch(`/api/coins/${coin.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(coinData),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    await router.push(`/monety/${coin.value.id}`)
  } catch {
    errorMessage.value = 'Nie udało się zapisać zmian monety.'
  }
}

function cancelEditing(): void {
  if (coin.value) {
    void router.push(`/monety/${coin.value.id}`)
    return
  }

  void router.push('/monety')
}

onMounted(loadCoin)
</script>

<template>
  <section>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <CoinForm
      v-if="coin"
      :coin="coin"
      @submit="saveCoin"
      @cancel="cancelEditing"
    />
  </section>
</template>
