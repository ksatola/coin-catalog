<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { Category } from '../types'

const props = defineProps<{
  coinId: number
}>()

const assignedCategories = ref<Category[]>([])
const categories = ref<Category[]>([])
const selectedCategoryIds = ref<number[]>([])
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
    selectedCategoryIds.value = []
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
  if (selectedCategoryIds.value.length === 0) return

  try {
    for (const categoryId of selectedCategoryIds.value) {
      const response = await fetch(
        `/api/coins/${props.coinId}/categories/${categoryId}`,
        { method: 'POST' },
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
    }

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
  <section class="category-assignment form-section">
    <div class="section-heading"><h3>Kategorie</h3></div>

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
      <label>
        Wybierz kategorie
        <select v-model="selectedCategoryIds" multiple size="5">
          <option
            v-for="category in availableCategories()"
            :key="category.id"
            :value="category.id"
          >
            {{ category.name }}
          </option>
        </select>
      </label>
      <small>Możesz wybrać więcej niż jedną kategorię.</small>
      <button type="submit" :disabled="selectedCategoryIds.length === 0">
        Dodaj kategorie
      </button>
    </form>
  </section>
</template>

<style scoped>
.category-assignment { display: grid; gap: 18px; padding: 24px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04); }
.category-assignment .section-heading h3 { margin: 0; font-size: 1.1rem; }
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
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
}

.category-form { display: grid; gap: 10px; }

.category-form label {
  display: grid;
  gap: 8px;
  color: #334155;
  font-weight: 600;
}

.category-form select {
  box-sizing: border-box;
  width: 100%;
  min-height: 132px;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #fff;
  color: #0f172a;
  font: inherit;
}

.category-form small { color: #64748b; font-size: .8rem; }
.category-form button { justify-self: start; min-height: 44px; padding: 10px 18px; border: 1px solid #0f172a; border-radius: 8px; background: #0f172a; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
.category-form button:disabled { cursor: not-allowed; opacity: .55; }
.category-assignment button:focus-visible, .category-assignment select:focus-visible { outline: 3px solid rgba(59,130,246,.25); outline-offset: 2px; }
.error { color: #b00020; }
</style>
