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
  <section class="categories-page">
    <h1>Kategorie</h1>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="categories-layout">
      <aside class="category-sidebar">
        <div class="sidebar-header">
          <h2>Kategorie</h2>
          <button type="button" class="primary-action new-category" @click="resetForm">
            Nowa kategoria
          </button>
        </div>

        <nav class="category-menu" aria-label="Kategorie">
          <button
            v-for="category in categories"
            :key="category.id"
            type="button"
            :class="{ active: selectedId === category.id }"
            @click="selectCategory(category)"
          >
            <span>{{ category.name }}</span>
            <small>{{ category.child_ids.length }} dzieci</small>
          </button>
        </nav>
      </aside>

      <form class="category-editor" @submit.prevent="saveCategory">
        <header class="editor-header">
          <div>
            <p class="eyebrow">Kategoria</p>
            <h2>{{ editing ? 'Edytuj kategorię' : 'Nowa kategoria' }}</h2>
          </div>
        </header>

        <label class="field">
          <span>Nazwa</span>
          <input v-model="name" type="text" required autocomplete="off" />
        </label>

        <label class="field">
          <span>Opis</span>
          <textarea v-model="description" rows="4" />
        </label>

        <section v-if="!editing" class="relation-card">
          <div class="section-heading">
            <div>
              <h3>Rodzice</h3>
              <p>Opcjonalnie przypisz nowych rodziców.</p>
            </div>
          </div>
          <label class="field">
            <span>Wybierz rodziców</span>
            <select v-model="parentIds" multiple size="5">
              <option v-for="category in availableParents()" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>
          <small>Możesz wybrać więcej niż jednego rodzica.</small>
        </section>

        <template v-if="selectedCategory">
          <section class="relation-card">
            <div class="section-heading">
              <div>
                <h3>Rodzice</h3>
                <p>Aktualne relacje rodzic-dziecko.</p>
              </div>
            </div>

            <div class="relation-list">
              <div v-for="parent in selectedCategory.parent_ids" :key="parent" class="relation-item">
                <span>{{ categoryName(parent) }}</span>
                <button type="button" class="danger-action compact-action" @click="removeParent(parent)">
                  Usuń
                </button>
              </div>
              <p v-if="selectedCategory.parent_ids.length === 0" class="empty-state">Brak rodziców.</p>
            </div>

            <div class="relation-controls">
              <select v-model="parentIds" multiple size="4">
                <option v-for="category in availableParents()" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
              <button type="button" class="secondary-action" :disabled="parentIds.length === 0" @click="addParents">
                Dodaj rodziców
              </button>
            </div>
          </section>

          <section class="relation-card">
            <div class="section-heading">
              <div>
                <h3>Dzieci</h3>
                <p>Kategorie podrzędne powiązane z tą kategorią.</p>
              </div>
            </div>

            <div class="relation-list">
              <div v-for="child in selectedCategory.child_ids" :key="child" class="relation-item">
                <span>{{ categoryName(child) }}</span>
                <button type="button" class="danger-action compact-action" @click="removeChild(child)">
                  Usuń
                </button>
              </div>
              <p v-if="selectedCategory.child_ids.length === 0" class="empty-state">Brak dzieci.</p>
            </div>

            <div class="relation-controls">
              <select v-model="childIds" multiple size="4">
                <option v-for="category in availableChildren()" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
              <button type="button" class="secondary-action" :disabled="childIds.length === 0" @click="addChildren">
                Dodaj dzieci
              </button>
            </div>
          </section>
        </template>

        <footer class="actions">
          <button type="submit" class="primary-action">
            {{ editing ? 'Zapisz' : 'Dodaj' }}
          </button>
          <button v-if="editing" type="button" class="secondary-action" @click="resetForm">
            Anuluj
          </button>
          <button v-if="editing" type="button" class="danger-action" @click="deleteCategory">
            Usuń kategorię
          </button>
        </footer>
      </form>
    </div>
  </section>
</template>

<style scoped>
.categories-page {
  min-width: 0;
}

.categories-page > h1 {
  margin-bottom: 24px;
}

.categories-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.category-sidebar,
.category-editor,
.relation-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.category-sidebar {
  padding: 20px;
}

.sidebar-header {
  display: grid;
  gap: 14px;
  margin-bottom: 16px;
}

.sidebar-header h2,
.editor-header h2,
.section-heading h3 {
  margin: 0;
  color: #0f172a;
}

.sidebar-header h2 {
  font-size: 1rem;
}

.new-category {
  width: 100%;
}

.category-menu {
  display: grid;
  gap: 6px;
}

.category-menu button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 44px;
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #334155;
  font: inherit;
  font-size: .9rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.category-menu button:hover {
  background: #f8fafc;
}

.category-menu button.active {
  border-color: #dbe3ed;
  background: #e8eef5;
  color: #0f172a;
  font-weight: 700;
}

.category-menu small {
  color: #64748b;
  font-size: .75rem;
  font-weight: 500;
  white-space: nowrap;
}

.category-editor {
  display: grid;
  gap: 18px;
  min-width: 0;
  padding: 26px;
}

.editor-header {
  margin-bottom: 2px;
}

.editor-header h2 {
  font-size: 1.35rem;
}

.eyebrow {
  margin: 0 0 4px;
  color: #64748b;
  font-size: .75rem;
  font-weight: 700;
}

.field {
  display: grid;
  gap: 7px;
}

.field > span {
  color: #0f172a;
  font-size: .875rem;
  font-weight: 600;
}

.field input,
.field textarea,
.field select,
.relation-controls select {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
}

.field input {
  min-height: 44px;
  padding: 10px 12px;
}

.field textarea {
  min-height: 100px;
  padding: 10px 12px;
  resize: vertical;
}

.field select,
.relation-controls select {
  min-height: 132px;
  padding: 8px;
}

.field input:focus-visible,
.field textarea:focus-visible,
.field select:focus-visible,
.relation-controls select:focus-visible {
  outline: 3px solid rgba(59, 130, 246, .25);
  outline-offset: 2px;
}

.relation-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  box-shadow: none;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.section-heading h3 {
  font-size: 1rem;
}

.section-heading p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: .8rem;
}

.relation-card small {
  color: #64748b;
  font-size: .8rem;
}

.relation-list {
  display: grid;
  gap: 6px;
}

.relation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  padding: 7px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  color: #334155;
}

.empty-state {
  margin: 0;
  color: #64748b;
  font-size: .875rem;
}

.relation-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
}

.relation-controls select {
  min-height: 110px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 4px;
}

.primary-action,
.secondary-action,
.danger-action {
  min-height: 40px;
  padding: 8px 13px;
  border-radius: 8px;
  font: inherit;
  font-size: .875rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.primary-action {
  border: 1px solid #0f172a;
  background: #0f172a;
  color: #ffffff;
}

.secondary-action {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
}

.danger-action {
  border: 1px solid #fecaca;
  background: #ffffff;
  color: #991b1b;
}

.primary-action:hover {
  background: #1e293b;
}

.secondary-action:hover {
  background: #f8fafc;
}

.danger-action:hover {
  background: #fef2f2;
}

.compact-action {
  min-height: 34px;
  padding: 6px 10px;
  font-size: .8rem;
}

button:disabled {
  cursor: default;
  opacity: .55;
}

.error {
  margin: 0 0 16px;
  color: #991b1b;
  font-size: .875rem;
}

@media (max-width: 800px) {
  .categories-layout {
    grid-template-columns: 1fr;
  }

  .category-menu {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .category-editor {
    padding: 20px;
  }

  .category-menu,
  .relation-controls {
    grid-template-columns: 1fr;
  }
}
</style>
