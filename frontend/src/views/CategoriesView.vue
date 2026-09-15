<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { Category, CategoryGraphItem } from '../types'

const categories = ref<CategoryGraphItem[]>([])
const selectedId = ref<number | null>(null)
const name = ref('')
const description = ref('')
const parentId = ref<number | null>(null)
const errorMessage = ref('')
const editing = computed(() => selectedId.value !== null)

const selectedCategory = computed(
  () => categories.value.find((category) => category.id === selectedId.value) ?? null,
)

async function loadCategories(): Promise<void> {
  try {
    const response = await fetch('/api/categories', { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    categories.value = await response.json() as CategoryGraphItem[]
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać kategorii.'
  }
}

function selectCategory(category: CategoryGraphItem): void {
  selectedId.value = category.id
  name.value = category.name
  description.value = category.description ?? ''
  parentId.value = null
}

function resetForm(): void {
  selectedId.value = null
  name.value = ''
  description.value = ''
  parentId.value = null
}

async function saveCategory(): Promise<void> {
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    errorMessage.value = 'Nazwa nie może być pusta.'
    return
  }

  const isEditing = selectedId.value !== null
  const url = isEditing ? `/api/categories/${selectedId.value}` : '/api/categories'

  try {
    const response = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmedName,
        description: description.value.trim() || null,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    await loadCategories()
    if (!isEditing) resetForm()
  } catch {
    errorMessage.value = 'Nie udało się zapisać kategorii.'
  }
}

async function deleteCategory(): Promise<void> {
  if (!selectedCategory.value) return

  if (!window.confirm(`Czy na pewno usunąć kategorię „${selectedCategory.value.name}”?`)) {
    return
  }

  try {
    const response = await fetch(`/api/categories/${selectedCategory.value.id}`, {
      method: 'DELETE',
    })

    if (response.status === 409) {
      errorMessage.value = 'Nie można usunąć kategorii, ponieważ jest używana.'
      return
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    resetForm()
    await loadCategories()
  } catch {
    errorMessage.value = 'Nie udało się usunąć kategorii.'
  }
}

async function addParent(): Promise<void> {
  if (selectedId.value === null || parentId.value === null) return

  try {
    const response = await fetch(
      `/api/categories/${selectedId.value}/parents/${parentId.value}`,
      { method: 'POST' },
    )

    if (response.status === 409) {
      errorMessage.value = 'Nie można dodać rodzica, ponieważ relacja utworzyłaby cykl.'
      return
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    parentId.value = null
    await loadCategories()
  } catch {
    errorMessage.value = 'Nie udało się dodać rodzica.'
  }
}

async function removeParent(parentCategoryId: number): Promise<void> {
  if (selectedId.value === null) return

  try {
    const response = await fetch(
      `/api/categories/${selectedId.value}/parents/${parentCategoryId}`,
      { method: 'DELETE' },
    )

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await loadCategories()
  } catch {
    errorMessage.value = 'Nie udało się usunąć relacji rodzic-dziecko.'
  }
}

function categoryName(id: number): string {
  return categories.value.find((category) => category.id === id)?.name ?? `#${id}`
}

function availableParents(): CategoryGraphItem[] {
  if (!selectedCategory.value) return []

  const blocked = new Set([
    selectedCategory.value.id,
    ...selectedCategory.value.child_ids,
    ...selectedCategory.value.parent_ids,
  ])
  return categories.value.filter((category) => !blocked.has(category.id))
}

onMounted(loadCategories)
</script>

<template>
  <section>
    <h1>Kategorie</h1>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="layout">
      <div>
        <button type="button" @click="resetForm">+ Nowa kategoria</button>
        <ul class="category-list">
          <li v-for="category in categories" :key="category.id">
            <button type="button" @click="selectCategory(category)">
              {{ category.name }}
            </button>
            <small v-if="category.child_ids.length">
              ({{ category.child_ids.length }} dzieci)
            </small>
          </li>
        </ul>
      </div>

      <form class="editor" @submit.prevent="saveCategory">
        <h2>{{ editing ? 'Edytuj kategorię' : 'Nowa kategoria' }}</h2>

        <label>
          Nazwa
          <input v-model="name" type="text" required autocomplete="off" />
        </label>

        <label>
          Opis
          <textarea v-model="description" rows="4" />
        </label>

        <div v-if="selectedCategory">
          <h3>Rodzice</h3>
          <ul>
            <li v-for="parent in selectedCategory.parent_ids" :key="parent">
              {{ categoryName(parent) }}
              <button type="button" @click="removeParent(parent)">Usuń</button>
            </li>
            <li v-if="selectedCategory.parent_ids.length === 0">Brak rodziców.</li>
          </ul>

          <form @submit.prevent="addParent">
            <select v-model.number="parentId">
              <option :value="null">Wybierz rodzica</option>
              <option
                v-for="category in availableParents()"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
            <button type="submit" :disabled="parentId === null">Dodaj rodzica</button>
          </form>

          <h3>Dzieci</h3>
          <ul>
            <li v-for="child in selectedCategory.child_ids" :key="child">
              {{ categoryName(child) }}
            </li>
            <li v-if="selectedCategory.child_ids.length === 0">Brak dzieci.</li>
          </ul>
        </div>

        <div class="actions">
          <button type="submit">{{ editing ? 'Zapisz' : 'Dodaj' }}</button>
          <button v-if="editing" type="button" @click="resetForm">Anuluj</button>
          <button v-if="editing" type="button" @click="deleteCategory">Usuń</button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(320px, 2fr);
  gap: 24px;
  align-items: start;
}

.category-list {
  padding: 0;
  list-style: none;
}

.category-list li {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 6px 0;
}

.editor {
  display: grid;
  gap: 12px;
}

.editor label {
  display: grid;
  gap: 4px;
}

.actions {
  display: flex;
  gap: 8px;
}

.error {
  color: #b00020;
}
</style>
