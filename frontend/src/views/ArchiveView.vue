<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import CoinGrid from '../components/CoinGrid.vue'
import CoinList from '../components/CoinList.vue'
import type { Coin } from '../types'

const router = useRouter()
const coins = ref<Coin[]>([])
const errorMessage = ref('')
const viewMode = ref<'grid' | 'list'>('grid')

async function loadArchivedCoins(): Promise<void> {
  try {
    const response = await fetch('/api/coins/archived')

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    coins.value = await response.json() as Coin[]
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać archiwum.'
  }
}

async function restoreCoin(coin: Coin): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${coin.id}/restore`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    await loadArchivedCoins()
  } catch {
    errorMessage.value = 'Nie udało się przywrócić monety.'
  }
}

onMounted(loadArchivedCoins)
</script>

<template>
  <section>
    <header>
      <h1>Archiwum</h1>

      <div>
        <button
          type="button"
          :disabled="viewMode === 'grid'"
          @click="viewMode = 'grid'"
        >
          ▦ Grid
        </button>

        <button
          type="button"
          :disabled="viewMode === 'list'"
          @click="viewMode = 'list'"
        >
          ☷ Lista
        </button>
      </div>
    </header>

    <p v-if="errorMessage">{{ errorMessage }}</p>
    <p v-if="coins.length === 0">Brak zarchiwizowanych monet.</p>

    <CoinGrid v-else-if="viewMode === 'grid'" :coins="coins" />

    <CoinList
      v-else
      :coins="coins"
      archived
      @details="(coin) => router.push(`/monety/${coin.id}`)"
      @restore="restoreCoin"
    />
  </section>
</template>
