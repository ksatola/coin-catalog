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
const isOpen = ref(false)
const name = ref('')
const description = ref('')
const saving = ref(false)

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

  saving.value = true
  errorMessage.value = ''
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
  } finally {
    saving.value = false
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

function toggle(): void {
  if (isOpen.value) {
    cancel()
    return
  }

  isOpen.value = true
  errorMessage.value = ''
}

function cancel(): void {
  isOpen.value = false
  name.value = ''
  description.value = ''
  errorMessage.value = ''
}

async function create(): Promise<void> {
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    errorMessage.value = 'Nazwa nie może być pusta.'
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmedName,
        description: description.value.trim() || null,
      }),
    })

    if (response.status === 409) {
      errorMessage.value = 'Kategoria o tej nazwie już istnieje.'
      return
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const created = await response.json() as Category
    const attachResponse = await fetch(
      `/api/coins/${props.coinId}/categories/${created.id}`,
      { method: 'POST' },
    )
    if (!attachResponse.ok) throw new Error(`HTTP ${attachResponse.status}`)

    await load()
    cancel()
  } catch {
    errorMessage.value = 'Nie udało się dodać kategorii.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="category-assignment form-section">
    <div>
      <h3>Kategorie</h3>
      <p>Moneta może mieć wiele przypisanych kategorii.</p>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="loading">Ładowanie kategorii…</p>

    <ul v-if="assignedCategories.length" class="category-list">
      <li v-for="category in assignedCategories" :key="category.id">
        <span>{{ category.name }}</span>
        <button type="button" :disabled="saving" @click="detach(category)">Usuń</button>
      </li>
    </ul>
    <p v-else>Brak przypisanych kategorii.</p>

    <div class="category-actions">
      <button
        type="button"
        class="save-button"
        :disabled="selectedCategoryIds.length === 0 || saving"
        @click="attach"
      >
        {{ saving ? 'Zapisywanie…' : 'Zapisz kategorię' }}
      </button>

      <button type="button" class="open-button" :aria-expanded="isOpen" @click="toggle">
        Dodaj kategorię
      </button>
    </div>

    <div v-if="selectedCategoryIds.length > 0" class="selection">
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
    </div>

    <label v-else class="category-select">
      <span>Wybierz kategorie</span>
      <select v-model="selectedCategoryIds" multiple size="5">
        <option
          v-for="category in availableCategories()"
          :key="category.id"
          :value="category.id"
        >
          {{ category.name }}
        </option>
      </select>
      <small>Możesz wybrać więcej niż jedną kategorię.</small>
    </label>

    <div v-if="isOpen" class="editor">
      <label class="editor-field">
        <span>Nazwa nowej kategorii</span>
        <input v-model="name" type="text" autocomplete="off" />
      </label>

      <label class="editor-field">
        <span>Opis</span>
        <textarea v-model="description" rows="3" />
      </label>

      <div class="editor-actions">
        <button type="button" class="editor-primary" :disabled="saving" @click="create">
          Dodaj
        </button>
        <button type="button" class="editor-secondary" :disabled="saving" @click="cancel">
          Anuluj
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.category-assignment {
  display: grid;
  gap: 18px;
  padding: 24px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.category-assignment h3 {
  margin: 0 0 4px;
  color: #0f172a;
  font-size: 1.1rem;
}

.category-assignment p {
  margin: 0;
  color: #64748b;
  font-size: .85rem;
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
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
}

.category-list button {
  min-height: 32px;
  padding: 5px 9px;
  border: 1px solid #fecaca;
  border-radius: 7px;
  background: #fff;
  color: #991b1b;
  font: inherit;
  font-size: .8rem;
  font-weight: 700;
}

.category-select,
.selection label,
.editor-field {
  display: grid;
  gap: 8px;
  color: #334155;
  font-weight: 600;
}

.category-select select,
.selection select,
.editor input,
.editor textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #fff;
  color: #0f172a;
  font: inherit;
}

.category-select select,
.selection select {
  min-height: 132px;
}

.category-select small,
.selection small {
  color: #64748b;
  font-size: .8rem;
  font-weight: 400;
}

.category-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.save-button,
.open-button {
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 8px;
  font: inherit;
  font-size: .875rem;
  font-weight: 700;
}

.save-button {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
}

.save-button:disabled {
  border-color: #cbd5e1;
  background: #e2e8f0;
  color: #64748b;
}

.open-button {
  border: 1px solid #0f172a;
  background: #0f172a;
  color: #fff;
}

.editor {
  display: grid;
  gap: 12px;
  width: min(420px, 100%);
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .12);
}

.editor textarea {
  min-height: 88px;
  resize: vertical;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-actions button {
  min-height: 36px;
  padding: 8px 12px;
  border-radius: 8px;
  font: inherit;
  font-size: .875rem;
  font-weight: 700;
}

.editor-primary {
  border: 1px solid #0f172a;
  background: #0f172a;
  color: #fff;
}

.editor-secondary {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
}

.category-assignment button:focus-visible,
.category-assignment select:focus-visible,
.category-assignment input:focus-visible,
.category-assignment textarea:focus-visible {
  outline: 3px solid rgba(59, 130, 246, .25);
  outline-offset: 2px;
}

.error {
  color: #b00020;
}
</style>
