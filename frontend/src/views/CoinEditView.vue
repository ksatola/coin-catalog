<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CategoryAssignment from '../components/CategoryAssignment.vue'
import CollectionAssignment from '../components/CollectionAssignment.vue'
import CoinForm from '../components/CoinForm.vue'
import type { Collection, Coin, CoinFormSubmit, CoinImage } from '../types'
import { useUnsavedCoinForm } from '../composables/useUnsavedCoinForm'

const route = useRoute()
const router = useRouter()
const { markClean, markDirty } = useUnsavedCoinForm()

const coin = ref<Coin | null>(null)
const collections = ref<Collection[]>([])
const selectedCollectionId = ref(0)
const savedCollectionId = ref(0)
const currentCoinId = ref(0)
const errorMessage = ref('')
const collectionsErrorMessage = ref('')
const savingCollection = ref(false)

async function loadCoin(): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${route.params.id}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    coin.value = await response.json() as Coin
    currentCoinId.value = coin.value.id
    selectedCollectionId.value = coin.value.collection_id
    savedCollectionId.value = coin.value.collection_id
    markClean()
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać monety.'
  }
}

async function loadCollections(): Promise<void> {
  try {
    const response = await fetch('/api/collections', { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    collections.value = await response.json() as Collection[]
    collectionsErrorMessage.value = ''
  } catch {
    collectionsErrorMessage.value = 'Nie udało się pobrać kolekcji.'
  }
}

function addCreatedCollection(collection: Collection): void {
  collections.value.push(collection)
  selectedCollectionId.value = collection.id
}

async function saveCollection(): Promise<void> {
  if (!currentCoinId.value || !selectedCollectionId.value || selectedCollectionId.value === savedCollectionId.value) return

  savingCollection.value = true
  errorMessage.value = ''
  try {
    const response = await fetch(`/api/coins/${currentCoinId.value}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_collection_id: selectedCollectionId.value }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const movedCoin = await response.json() as Coin
    currentCoinId.value = movedCoin.id
    savedCollectionId.value = movedCoin.collection_id
    selectedCollectionId.value = movedCoin.collection_id
    markClean()
  } catch {
    errorMessage.value = 'Nie udało się zapisać kolekcji monety.'
  } finally {
    savingCollection.value = false
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
  if (replace) params.set('replace', 'true')

  const response = await fetch(`/api/coins/${coinId}/images?${params.toString()}`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
}

async function deleteImage(coinId: number, image: CoinImage): Promise<void> {
  const response = await fetch(`/api/coins/${coinId}/images/${image.id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
}

async function saveCoin(payload: CoinFormSubmit): Promise<void> {
  if (!coin.value || !currentCoinId.value || !savedCollectionId.value) {
    errorMessage.value = 'Nie udało się ustalić monety lub jej kolekcji.'
    return
  }

  if (selectedCollectionId.value !== savedCollectionId.value) {
    errorMessage.value = 'Najpierw zapisz zmianę kolekcji osobnym przyciskiem.'
    return
  }

  try {
    const coinUpdate = { ...payload.coin, collection_id: savedCollectionId.value }
    const response = await fetch(`/api/coins/${currentCoinId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coinUpdate),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    if (payload.images.avers) await uploadFile(currentCoinId.value, payload.images.avers, 'avers', true)
    if (payload.images.rewers) await uploadFile(currentCoinId.value, payload.images.rewers, 'rewers', true)
    for (const file of payload.images.additional) await uploadFile(currentCoinId.value, file, 'additional')
    for (const image of payload.images.additionalDeletes) await deleteImage(currentCoinId.value, image)

    markClean()
    await router.push(`/monety/${currentCoinId.value}`)
  } catch {
    errorMessage.value = 'Nie udało się zapisać zmian monety lub jej zdjęć.'
  }
}

function cancelEditing(): void {
  if (coin.value) {
    void router.push(`/monety/${currentCoinId.value}`)
    return
  }
  void router.push('/monety')
}

onMounted(() => {
  void loadCoin()
  void loadCollections()
})
</script>

<template>
  <section>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <p v-if="collectionsErrorMessage">{{ collectionsErrorMessage }}</p>

    <header class="edit-page-header">
      <h2>Edytuj monetę</h2>
    </header>

    <CollectionAssignment
      v-if="coin"
      v-model:selected-collection-id="selectedCollectionId"
      :collections="collections"
      :saved-collection-id="savedCollectionId"
      :saving-collection="savingCollection"
      @created="addCreatedCollection"
      @save="saveCollection"
    />

    <CoinForm
      v-if="coin"
      :coin="coin"
      :image-coin-id="currentCoinId"
      class="edit-coin-form"
      @submit="saveCoin"
      @cancel="cancelEditing"
    />
    <CategoryAssignment v-if="coin" :coin-id="currentCoinId" />
  </section>
</template>

<style scoped>
.edit-page-header {
  max-width: 1200px;
  margin: 0 auto 28px;
}

.edit-page-header h2 {
  margin: 0;
  padding-top: 24px;
  font-size: 1.75rem;
  line-height: 1.2;
}

.edit-coin-form :deep(.form-header) {
  display: none;
}
</style>
