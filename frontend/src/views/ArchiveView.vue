<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import CoinFilters from '../components/CoinFilters.vue'
import CoinGrid from '../components/CoinGrid.vue'
import CoinList from '../components/CoinList.vue'
import { buildCoinFilterQuery, resetCoinFilters, useCoinFilters } from '../composables/useCoinFilters'
import type { Coin } from '../types'

const router = useRouter()
const filters = useCoinFilters('archive')
const coins = ref<Coin[]>([])
const errorMessage = ref('')
const viewMode = ref<'grid' | 'list'>('grid')

async function loadArchivedCoins(): Promise<void> {
  try {
    const query = buildCoinFilterQuery(filters)
    const response = await fetch(`/api/coins${query ? `?${query}` : ''}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    coins.value = await response.json() as Coin[]
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać archiwum.'
  }
}

async function restoreCoin(coin: Coin): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${coin.id}/restore`, { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await loadArchivedCoins()
  } catch {
    errorMessage.value = 'Nie udało się przywrócić monety.'
  }
}

function resetFilters(): void {
  resetCoinFilters(filters, 'archived')
  void loadArchivedCoins()
}

onMounted(loadArchivedCoins)
</script>

<template>
  <section>
    <header>
      <h1>Archiwum</h1>
      <div>
        <button type="button" :disabled="viewMode === 'grid'" @click="viewMode = 'grid'">▦ Grid</button>
        <button type="button" :disabled="viewMode === 'list'" @click="viewMode = 'list'">☷ Lista</button>
      </div>
    </header>

    <CoinFilters :filters="filters" @submit="loadArchivedCoins" />
    <button type="button" @click="resetFilters">Wyczyść filtry</button>

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
