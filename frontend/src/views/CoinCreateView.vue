<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import CoinForm from '../components/CoinForm.vue'
import type { CoinFormSubmit } from '../types'

const router = useRouter()
const errorMessage = ref('')

async function uploadFile(
  coinId: number,
  file: File,
  kind: 'avers' | 'rewers' | 'additional',
): Promise<void> {
  const formData = new FormData()
  formData.append('upload', file)

  const response = await fetch(
    `/api/coins/${coinId}/images?kind=${kind}`,
    {
      method: 'POST',
      body: formData,
    },
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
}

async function createCoin(payload: CoinFormSubmit): Promise<void> {
  try {
    const response = await fetch('/api/coins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload.coin),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const coin = await response.json() as { id: number }

    await uploadFile(coin.id, payload.images.avers as File, 'avers')
    await uploadFile(coin.id, payload.images.rewers as File, 'rewers')

    for (const file of payload.images.additional) {
      await uploadFile(coin.id, file, 'additional')
    }

    errorMessage.value = ''
    await router.push(`/monety/${coin.id}`)
  } catch {
    errorMessage.value = 'Nie udało się zapisać monety lub jej zdjęć.'
  }
}
</script>

<template>
  <section>
    <h1>Dodaj monetę</h1>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <CoinForm @submit="createCoin" />
  </section>
</template>
