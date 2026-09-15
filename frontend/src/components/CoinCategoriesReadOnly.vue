<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { Category } from '../types'

const props = defineProps<{
  coinId: number
}>()

const categories = ref<Category[]>([])
const errorMessage = ref('')

async function loadCategories(): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${props.coinId}/categories`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    categories.value = await response.json() as Category[]
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać kategorii.'
  }
}

onMounted(loadCategories)
</script>

<template>
  <section class="coin-categories">
    <h2>Kategorie</h2>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <ul v-else-if="categories.length" class="category-list">
      <li v-for="category in categories" :key="category.id">
        {{ category.name }}
      </li>
    </ul>
    <p v-else>Brak przypisanych kategorii.</p>
  </section>
</template>

<style scoped>
.coin-categories {
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
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.error {
  color: #b00020;
}
</style>
