<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { Category } from '../types'

const props = defineProps<{
  coinId: number
}>()

const assignedCategories = ref<Category[]>([])
const categories = ref<Category[]>([])
const selectedCategoryId = ref<number | null>(null)
const errorMessage = ref('')
const loading = ref(false)

async function load(): Promise<void> {
  loading.value = true
  try {
    const [assignedResponse, categoriesResponse] = await Promise.all([
      fetch(`/api/coins/${props.coinId}/categories`),
      fetch('/api/categories'),
    ])

    if (!assignedResponse.ok || !categoriesResponse.ok) {
      throw new Error('Failed to load categories')
    }

    assignedCategories.value = await assignedResponse.json() as Category[]
    categories.value = await categoriesResponse.json() as Category[]
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać kategorii.'
  } finally {
    loading.value = false
  }
}

function availableCategories(): Category[] {
  const assignedIds = new Set(assignedCategories.value.map((category) => category.id))
  return categories.value.filter((category) => !assignedIds.has(category.id))
}

async function attach(): Promise<void> {
  if (selectedCategoryId.value === null) return

  try {
    const response = await fetch(
      `/api/coins/${props.coinId}/categories/${selectedCategoryId.value}`,
      { method: 'POST' },
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    selectedCategoryId.value = null
    await load()
  } catch {
    errorMessage.value = 'Nie udało się przypisać kategorii.'
  }
}

async function detach(category: Category): Promise<void> {
  try {
    const response = await fetch(
      `/api/coins/${props.coinId}/categories/${category.id}`,
      { method: 'DELETE' },
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    await load()
  } catch {
    errorMessage.value = 'Nie udało się usunąć kategorii z monety.'
  }
}

onMounted(load)
</script>

<template>
  <section class="category-assignment">
    <h2>Kategorie</h2>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="loading">Ładowanie kategorii…</p>

    <ul v-if="assignedCategories.length" class="category-list">
      <li v-for="category in assignedCategories" :key="category.id">
        <span>{{ category.name }}</span>
        <button type="button" @click="detach(category)">Usuń</button>
      </li>
    </ul>
    <p v-else>Brak przypisanych kategorii.</p>

    <form class="category-form" @submit.prevent="attach">
      <select v-model.number="selectedCategoryId">
        <option :value="null">Wybierz kategorię</option>
        <option
          v-for="category in availableCategories()"
          :key="category.id"
          :value="category.id"
        >
          {{ category.name }}
        </option>
      </select>
      <button type="submit" :disabled="selectedCategoryId === null">
        Dodaj kategorię
      </button>
    </form>
  </section>
</template>

<style scoped>
.category-assignment {
  margin-top: 24px;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  list-style: none;
}

.category-list li {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.category-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.error {
  color: #b00020;
}
</style>
