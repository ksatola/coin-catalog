<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import CoinForm from '../components/CoinForm.vue'
import InlineCategoryCreate from '../components/InlineCategoryCreate.vue'
import type { CategoryGraphItem, CoinFormSubmit } from '../types'
import { useUnsavedCoinForm } from '../composables/useUnsavedCoinForm'

const router = useRouter()
const { markClean, markDirty } = useUnsavedCoinForm()
const errorMessage = ref('')
const categories = ref<CategoryGraphItem[]>([])
const selectedCategoryIds = ref<number[]>([])
const categoriesErrorMessage = ref('')

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

function addCreatedCategory(category: CategoryGraphItem): void {
  categories.value.push(category)
  selectedCategoryIds.value.push(category.id)
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
  try {
    const response = await fetch('/api/coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload.coin),
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

watch(selectedCategoryIds, () => {
  markDirty()
}, { deep: true })

onMounted(() => {
  markClean()
  void loadCategories()
})
</script>

<template>
  <section>
    <h1>Dodaj monetę</h1>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <p v-if="categoriesErrorMessage">{{ categoriesErrorMessage }}</p>

    <div class="category-assignment">
      <h2>Kategorie</h2>
      <label>
        Wybierz kategorie
        <select v-model="selectedCategoryIds" multiple size="5">
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </label>
      <small>Możesz wybrać więcej niż jedną kategorię, także parenta i childa.</small>
      <InlineCategoryCreate :categories="categories" @created="addCreatedCategory" />
    </div>

    <CoinForm @submit="createCoin" />
  </section>
</template>

<style scoped>
.category-assignment { display: grid; gap: 8px; margin-bottom: 24px; }
.category-assignment label { display: grid; gap: 4px; }
.category-assignment select { min-width: 220px; }
</style>
