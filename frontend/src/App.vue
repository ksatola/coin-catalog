<script setup lang="ts">
import { onMounted, ref } from 'vue'

import CoinArchive from './components/CoinArchive.vue'
import CoinDetail from './components/CoinDetail.vue'
import CoinForm from './components/CoinForm.vue'
import CoinList from './components/CoinList.vue'
import DictionaryEditor from './components/DictionaryEditor.vue'
import type { Coin, CoinCreate } from './types'

const coins = ref<Coin[]>([])
const archivedCoins = ref<Coin[]>([])
const selectedCoin = ref<Coin | null>(null)
const editingCoin = ref<Coin | null>(null)
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

async function loadArchivedCoins(): Promise<void> {
  try {
    const response = await fetch('/api/coins/archived')

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    archivedCoins.value = await response.json() as Coin[]
  } catch {
    errorMessage.value = 'Nie udało się pobrać archiwum.'
  }
}

async function loadAllCoins(): Promise<void> {
  await Promise.all([loadCoins(), loadArchivedCoins()])
}

function selectCoin(coin: Coin): void {
  selectedCoin.value = coin
  editingCoin.value = null
}

function startEditing(coin: Coin): void {
  editingCoin.value = coin
  selectedCoin.value = null
}

function cancelEditing(): void {
  editingCoin.value = null
}

async function saveCoin(coinData: CoinCreate): Promise<void> {
  const coin = editingCoin.value

  try {
    const response = await fetch(
      coin ? `/api/coins/${coin.id}` : '/api/coins',
      {
        method: coin ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(coinData),
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const savedCoin = await response.json() as Coin
    editingCoin.value = null
    selectedCoin.value = savedCoin
    await loadAllCoins()
  } catch {
    errorMessage.value = coin
      ? 'Nie udało się zapisać zmian monety.'
      : 'Nie udało się zapisać monety.'
  }
}

async function archiveCoin(coin: Coin): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${coin.id}/archive`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    if (selectedCoin.value?.id === coin.id) {
      selectedCoin.value = null
    }

    if (editingCoin.value?.id === coin.id) {
      editingCoin.value = null
    }

    await loadAllCoins()
  } catch {
    errorMessage.value = 'Nie udało się zarchiwizować monety.'
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

    selectedCoin.value = null
    await loadAllCoins()
  } catch {
    errorMessage.value = 'Nie udało się przywrócić monety.'
  }
}

onMounted(loadAllCoins)
</script>

<template>
  <main>
    <h1>Coin Catalog</h1>

    <DictionaryEditor />

    <CoinForm
      v-if="editingCoin"
      :coin="editingCoin"
      @submit="saveCoin"
      @cancel="cancelEditing"
    />

    <CoinForm v-else @submit="saveCoin" />

    <p v-if="errorMessage">{{ errorMessage }}</p>

    <CoinList
      :coins="coins"
      @details="selectCoin"
      @edit="startEditing"
      @archive="archiveCoin"
    />

    <CoinArchive
      :coins="archivedCoins"
      @details="selectCoin"
      @restore="restoreCoin"
    />

    <CoinDetail v-if="selectedCoin" :coin="selectedCoin" />
  </main>
</template>
