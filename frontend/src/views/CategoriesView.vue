<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { CategoryGraphItem } from '../types'

const categories = ref<CategoryGraphItem[]>([])
const selectedId = ref<number | null>(null)
const name = ref('')
const description = ref('')
const parentIds = ref<number[]>([])
const childIds = ref<number[]>([])
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
  parentIds.value = []
  childIds.value = []
}

function resetForm(): void {
  selectedId.value = null
  name.value = ''
  description.value = ''
  parentIds.value = []
  childIds.value = []
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

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const createdCategory = isEditing ? null : await response.json() as { id: number }
    if (!isEditing && createdCategory && parentIds.value.length > 0) {
      await addRelations(createdCategory.id, parentIds.value, 'parent')
    }

    await loadCategories()
    if (!isEditing) resetForm()
  } catch (error) {
    errorMessage.value = error instanceof Error && error.message === 'cycle'
      ? 'Nie można dodać rodzica, ponieważ relacja utworzyłaby cykl.'
      : 'Nie udało się zapisać kategorii.'
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

async function addRelations(
  categoryId: number,
  relationIds: number[],
  direction: 'parent' | 'child',
): Promise<void> {
  for (const relationId of relationIds) {
    const childId = direction === 'parent' ? categoryId : relationId
    const parentId = direction === 'parent' ? relationId : categoryId
    const response = await fetch(`/api/categories/${childId}/parents/${parentId}`, {
      method: 'POST',
    })

    if (response.status === 409) throw new Error('cycle')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  }
}

async function addParents(): Promise<void> {
  if (selectedId.value === null || parentIds.value.length === 0) return

  try {
    await addRelations(selectedId.value, parentIds.value, 'parent')
    parentIds.value = []
    await loadCategories()
  } catch (error) {
    errorMessage.value = error instanceof Error && error.message === 'cycle'
      ? 'Nie można dodać rodzica, ponieważ relacja utworzyłaby cykl.'
      : 'Nie udało się dodać rodziców.'
  }
}

async function addChildren(): Promise<void> {
  if (selectedId.value === null || childIds.value.length === 0) return

  try {
    await addRelations(selectedId.value, childIds.value, 'child')
    childIds.value = []
    await loadCategories()
  } catch (error) {
    errorMessage.value = error instanceof Error && error.message === 'cycle'
      ? 'Nie można dodać dziecka, ponieważ relacja utworzyłaby cykl.'
      : 'Nie udało się dodać dzieci.'
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

async function removeChild(childCategoryId: number): Promise<void> {
  if (selectedId.value === null) return

  try {
    const response = await fetch(
      `/api/categories/${childCategoryId}/parents/${selectedId.value}`,
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
  if (!selectedCategory.value) return categories.value

  const blocked = new Set([
    selectedCategory.value.id,
    ...selectedCategory.value.child_ids,
    ...selectedCategory.value.parent_ids,
  ])
  return categories.value.filter((category) => !blocked.has(category.id))
}

function availableChildren(): CategoryGraphItem[] {
  if (!selectedCategory.value) return []

  const blocked = new Set([
    selectedCategory.value.id,
    ...selectedCategory.value.parent_ids,
    ...selectedCategory.value.child_ids,
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

        <div v-if="!editing">
          <h3>Rodzice</h3>
          <label>
            Wybierz rodziców
            <select v-model="parentIds" multiple size="5">
              <option v-for="category in availableParents()" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>
          <small>Możesz wybrać więcej niż jednego rodzica.</small>
        </div>

        <div v-if="selectedCategory">
          <h3>Rodzice</h3>
          <ul>
            <li v-for="parent in selectedCategory.parent_ids" :key="parent">
              {{ categoryName(parent) }}
              <button type="button" @click="removeParent(parent)">Usuń</button>
            </li>
            <li v-if="selectedCategory.parent_ids.length === 0">Brak rodziców.</li>
          </ul>

          <div class="relation-controls">
            <select v-model="parentIds" multiple size="5">
              <option v-for="category in availableParents()" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
            <button type="button" :disabled="parentIds.length === 0" @click="addParents">
              Dodaj rodziców
            </button>
          </div>

          <h3>Dzieci</h3>
          <ul>
            <li v-for="child in selectedCategory.child_ids" :key="child">
              {{ categoryName(child) }}
              <button type="button" @click="removeChild(child)">Usuń</button>
            </li>
            <li v-if="selectedCategory.child_ids.length === 0">Brak dzieci.</li>
          </ul>

          <div class="relation-controls">
            <select v-model="childIds" multiple size="5">
              <option v-for="category in availableChildren()" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
            <button type="button" :disabled="childIds.length === 0" @click="addChildren">
              Dodaj dzieci
            </button>
          </div>
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

.relation-controls,
.actions {
  display: flex;
  gap: 8px;
  align-items: start;
}

.relation-controls select {
  min-width: 220px;
}

.error {
  color: #b00020;
}
</style>
