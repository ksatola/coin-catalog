<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CoinDetail from '../components/CoinDetail.vue'
import type { Coin } from '../types'

const route = useRoute()
const router = useRouter()

const coin = ref<Coin | null>(null)
const errorMessage = ref('')

async function loadCoin(): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${route.params.id}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    coin.value = await response.json() as Coin
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać monety.'
  }
}

async function archiveCoin(): Promise<void> {
  if (!coin.value) return

  try {
    const response = await fetch(`/api/coins/${coin.value.id}/archive`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    await loadCoin()
  } catch {
    errorMessage.value = 'Nie udało się zarchiwizować monety.'
  }
}

async function restoreCoin(): Promise<void> {
  if (!coin.value) return

  try {
    const response = await fetch(`/api/coins/${coin.value.id}/restore`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    await loadCoin()
  } catch {
    errorMessage.value = 'Nie udało się przywrócić monety.'
  }
}

onMounted(loadCoin)
</script>

<template>
  <section>
    <p v-if="errorMessage">{{ errorMessage }}</p>

    <template v-if="coin">
      <CoinDetail :coin="coin" />

      <div>
        <template v-if="!coin.is_deleted">
          <button
            type="button"
            @click="router.push(`/monety/${coin.id}/edytuj`)"
          >
            Edytuj
          </button>

          <button type="button" @click="archiveCoin">
            Archiwizuj
          </button>
        </template>

        <button v-else type="button" @click="restoreCoin">
          Przywróć
        </button>
      </div>
    </template>
  </section>
</template>
