<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import CollectionAssignment from '../components/CollectionAssignment.vue'
import CoinForm from '../components/CoinForm.vue'
import InlineCategoryCreate from '../components/InlineCategoryCreate.vue'
import type { CategoryGraphItem, Collection, CoinFormSubmit } from '../types'
import { useUnsavedCoinForm } from '../composables/useUnsavedCoinForm'

const router = useRouter()
const { markClean, markDirty } = useUnsavedCoinForm()
const errorMessage = ref('')
const categories = ref<CategoryGraphItem[]>([])
const selectedCategoryIds = ref<number[]>([])
const categoriesErrorMessage = ref('')
const collections = ref<Collection[]>([])
const selectedCollectionId = ref(0)
const collectionsErrorMessage = ref('')

async function loadCategories(): Promise<void> {
  try {
    const response = await fetch('/api/categories')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    categories.value = await response.json() as CategoryGraphItem[]
    categoriesErrorMessage.value = ''
  } catch {
    categoriesErrorMessage.value = 'Nie udało się pobrać kategorii.'
  }
}

async function loadCollections(): Promise<void> {
  try {
    const response = await fetch('/api/collections', { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    collections.value = await response.json() as Collection[]
    selectedCollectionId.value = collections.value[0]?.id ?? 0
    collectionsErrorMessage.value = ''
  } catch {
    collectionsErrorMessage.value = 'Nie udało się pobrać kolekcji.'
  }
}

async function addCreatedCategory(category: CategoryGraphItem): Promise<void> {
  categories.value.push(category)
  await nextTick()
  selectedCategoryIds.value = [...selectedCategoryIds.value, category.id]
  markDirty()
}

function addCreatedCollection(collection: Collection): void {
  collections.value.push(collection)
  selectedCollectionId.value = collection.id
  markDirty()
}

async function uploadFile(coinId: number, file: File, kind: 'avers' | 'rewers' | 'additional'): Promise<void> {
  const formData = new FormData()
  formData.append('upload', file)
  const response = await fetch(`/api/coins/${coinId}/images?kind=${kind}`, { method: 'POST', body: formData })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
}

async function assignCategories(coinId: number): Promise<void> {
  for (const categoryId of selectedCategoryIds.value) {
    const response = await fetch(`/api/coins/${coinId}/categories/${categoryId}`, { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  }
}

async function createCoin(payload: CoinFormSubmit): Promise<void> {
  if (!selectedCollectionId.value) {
    errorMessage.value = 'Wybierz kolekcję monety.'
    return
  }

  try {
    const response = await fetch('/api/coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload.coin, collection_id: selectedCollectionId.value }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const coin = await response.json() as { id: number }

    await uploadFile(coin.id, payload.images.avers as File, 'avers')
    await uploadFile(coin.id, payload.images.rewers as File, 'rewers')
    for (const file of payload.images.additional) await uploadFile(coin.id, file, 'additional')
    await assignCategories(coin.id)

    markClean()
    errorMessage.value = ''
    await router.push(`/monety/${coin.id}`)
  } catch {
    errorMessage.value = 'Nie udało się zapisać monety, jej zdjęć lub kategorii.'
  }
}

function cancelCreating(): void {
  void router.push('/monety')
}

watch(selectedCategoryIds, () => {
  markDirty()
}, { deep: true })
watch(selectedCollectionId, () => {
  if (selectedCollectionId.value === 0 || selectedCollectionId.value !== collections.value[0]?.id) markDirty()
})

onMounted(() => {
  markClean()
  void loadCategories()
  void loadCollections()
})
</script>

<template>
  <section>
    <h1>Dodaj monetę</h1>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <p v-if="categoriesErrorMessage">{{ categoriesErrorMessage }}</p>
    <p v-if="collectionsErrorMessage">{{ collectionsErrorMessage }}</p>

    <CollectionAssignment
      v-model:selected-collection-id="selectedCollectionId"
      mode="create"
      :collections="collections"
      @created="addCreatedCollection"
    />

    <section class="category-card">
      <h2>Kategorie</h2>
      <label class="category-field">
        <span>Wybierz kategorie</span>
        <select v-model="selectedCategoryIds" multiple size="5">
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </label>
      <small>Możesz wybrać więcej niż jedną kategorię, także parenta i childa.</small>
      <InlineCategoryCreate :categories="categories" @created="addCreatedCategory" />
    </section>

    <CoinForm @submit="createCoin" @cancel="cancelCreating" />
  </section>
</template>

<style scoped>
.category-card {
  display: grid;
  gap: 12px;
  margin: 0 0 24px;
  padding: 24px 26px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.category-card h2 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 1.1rem;
}

.category-field {
  display: grid;
  gap: 6px;
}

.category-field span {
  color: #0f172a;
  font-size: .875rem;
  font-weight: 600;
}

.category-field select {
  box-sizing: border-box;
  width: 100%;
  min-height: 132px;
  padding: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 1rem;
}

.category-field select:focus-visible {
  outline: 3px solid rgba(59, 130, 246, .25);
  outline-offset: 2px;
}

.category-card small {
  color: #475569;
  font-size: .8rem;
}
</style>
