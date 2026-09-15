<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CategoryAssignment from '../components/CategoryAssignment.vue'
import CoinForm from '../components/CoinForm.vue'
import type { Coin, CoinFormSubmit, CoinImage } from '../types'
import { useUnsavedCoinForm } from '../composables/useUnsavedCoinForm'

const route = useRoute()
const router = useRouter()
const { markClean } = useUnsavedCoinForm()

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
    markClean()
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać monety.'
  }
}

async function uploadFile(
  coinId: number,
  file: File,
  kind: 'avers' | 'rewers' | 'additional',
  replace = false,
): Promise<void> {
  const formData = new FormData()
  formData.append('upload', file)

  const params = new URLSearchParams({ kind })
  if (replace) {
    params.set('replace', 'true')
  }

  const response = await fetch(
    `/api/coins/${coinId}/images?${params.toString()}`,
    {
      method: 'POST',
      body: formData,
    },
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
}

async function deleteImage(coinId: number, image: CoinImage): Promise<void> {
  const response = await fetch(
    `/api/coins/${coinId}/images/${image.id}`,
    {
      method: 'DELETE',
    },
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
}

async function saveCoin(payload: CoinFormSubmit): Promise<void> {
  if (!coin.value) return

  try {
    const response = await fetch(`/api/coins/${coin.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload.coin),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    if (payload.images.avers) {
      await uploadFile(coin.value.id, payload.images.avers, 'avers', true)
    }

    if (payload.images.rewers) {
      await uploadFile(coin.value.id, payload.images.rewers, 'rewers', true)
    }

    for (const file of payload.images.additional) {
      await uploadFile(coin.value.id, file, 'additional')
    }

    for (const image of payload.images.additionalDeletes) {
      await deleteImage(coin.value.id, image)
    }

    markClean()
    await router.push(`/monety/${coin.value.id}`)
  } catch {
    errorMessage.value = 'Nie udało się zapisać zmian monety lub jej zdjęć.'
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
    <CategoryAssignment v-if="coin" :coin-id="coin.id" />
  </section>
</template>
