<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import type { Collection } from '../types'

const router = useRouter()
const collections = ref<Collection[]>([])
const selectedId = ref<number | null>(null)
const name = ref('')
const description = ref('')
const errorMessage = ref('')
const saving = ref(false)

const selectedCollection = computed(
  () => collections.value.find((collection) => collection.id === selectedId.value) ?? null,
)
const editing = computed(() => selectedId.value !== null)

async function loadCollections(): Promise<void> {
  try {
    const response = await fetch('/api/collections', { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    collections.value = await response.json() as Collection[]
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać kolekcji.'
  }
}

function selectCollection(collection: Collection): void {
  selectedId.value = collection.id
  name.value = collection.name
  description.value = collection.description ?? ''
  errorMessage.value = ''
}

function resetForm(): void {
  selectedId.value = null
  name.value = ''
  description.value = ''
  errorMessage.value = ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = -1
  do {
    value /= 1024
    unitIndex += 1
  } while (value >= 1024 && unitIndex < units.length - 1)

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

async function saveCollection(): Promise<void> {
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    errorMessage.value = 'Nazwa nie może być pusta.'
    return
  }

  const isEditing = selectedId.value !== null
  const url = isEditing ? `/api/collections/${selectedId.value}` : '/api/collections'
  saving.value = true

  try {
    const response = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmedName,
        description: description.value.trim() || null,
      }),
    })

    if (response.status === 409) {
      errorMessage.value = 'Kolekcja o tej nazwie już istnieje.'
      return
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const saved = await response.json() as Collection
    await loadCollections()
    selectCollection(saved)
  } catch {
    errorMessage.value = 'Nie udało się zapisać kolekcji.'
  } finally {
    saving.value = false
  }
}

async function deleteCollection(): Promise<void> {
  if (!selectedCollection.value) return

  if (!window.confirm(`Czy na pewno usunąć kolekcję „${selectedCollection.value.name}”?`)) {
    return
  }

  try {
    const response = await fetch(`/api/collections/${selectedCollection.value.id}`, {
      method: 'DELETE',
    })

    if (response.status === 409) {
      errorMessage.value = 'Nie można usunąć kolekcji, ponieważ zawiera monety.'
      return
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    resetForm()
    await loadCollections()
  } catch {
    errorMessage.value = 'Nie udało się usunąć kolekcji.'
  }
}

onMounted(loadCollections)
</script>

<template>
  <section class="collections-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Organizacja zbioru</p>
        <h1>Kolekcje</h1>
        <p class="page-description">
          Każda moneta należy do dokładnie jednej kolekcji. Statystyki są przechowywane w bazie danych.
        </p>
      </div>
      <button type="button" class="primary-action" @click="resetForm">
        Nowa kolekcja
      </button>
    </header>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <div class="collections-layout">
      <aside class="collection-list" aria-label="Lista kolekcji">
        <div
          v-for="collection in collections"
          :key="collection.id"
          class="collection-item"
          :class="{ active: selectedId === collection.id }"
        >
          <button
            type="button"
            class="collection-select"
            @click="selectCollection(collection)"
          >
            <span class="collection-item-name">{{ collection.name }}</span>
            <span class="collection-item-meta">
              {{ collection.coin_count }} monet · {{ formatFileSize(collection.file_size_bytes) }}
            </span>
          </button>
          <button
            type="button"
            class="collection-show"
            @click="router.push(`/kolekcje/${collection.id}`)"
          >
            Pokaż
          </button>
        </div>
        <p v-if="collections.length === 0" class="empty-state">
          Brak kolekcji.
        </p>
      </aside>

      <form class="collection-editor" @submit.prevent="saveCollection">
        <div class="editor-heading">
          <div>
            <p class="eyebrow">Kolekcja</p>
            <h2>{{ editing ? 'Edytuj kolekcję' : 'Nowa kolekcja' }}</h2>
          </div>
        </div>

        <label class="field">
          <span>Nazwa</span>
          <input v-model="name" type="text" required autocomplete="off" />
        </label>

        <label class="field">
          <span>Opis</span>
          <textarea v-model="description" rows="4" />
        </label>

        <section v-if="selectedCollection" class="stats-section" aria-label="Statystyki kolekcji">
          <div class="section-heading">
            <div>
              <h3>Statystyki</h3>
              <p>Aktualizowane przez operacje na danych kolekcji.</p>
            </div>
          </div>

          <div class="stats-grid">
            <article class="stat-card">
              <span>Monety</span>
              <strong>{{ selectedCollection.coin_count }}</strong>
              <small>{{ selectedCollection.archived_coin_count }} zarchiwizowanych</small>
            </article>
            <article class="stat-card">
              <span>Pliki</span>
              <strong>{{ selectedCollection.image_count }}</strong>
              <small>{{ formatFileSize(selectedCollection.file_size_bytes) }}</small>
            </article>
            <article class="stat-card">
              <span>Kategorie</span>
              <strong>{{ selectedCollection.category_count }}</strong>
              <small>unikalnych użytych kategorii</small>
            </article>
            <article class="stat-card warning-card">
              <span>Bez zdjęć</span>
              <strong>{{ selectedCollection.coins_without_images_count }}</strong>
              <small>monet bez żadnego pliku</small>
            </article>
          </div>

          <p class="last-modified">
            Ostatnia zmiana: <strong>{{ formatDate(selectedCollection.last_modified_at) }}</strong>
          </p>
        </section>

        <footer class="actions">
          <button v-if="editing" type="button" class="secondary-action" @click="resetForm">
            Nowa kolekcja
          </button>
          <button v-if="editing" type="button" class="danger-action" @click="deleteCollection">
            Usuń kolekcję
          </button>
          <button type="submit" class="primary-action" :disabled="saving">
            {{ saving ? 'Zapisywanie…' : editing ? 'Zapisz' : 'Dodaj' }}
          </button>
        </footer>
      </form>
    </div>
  </section>
</template>

<style scoped>
.collections-page {
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.page-header h1,
.editor-heading h2,
.section-heading h3 {
  margin: 0;
  color: #0f172a;
}

.page-header h1 {
  font-size: 1.8rem;
}

.eyebrow {
  margin: 0 0 4px;
  color: #64748b;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.page-description,
.section-heading p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: .9rem;
}

.collections-layout {
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.collection-list,
.collection-editor,
.stats-section {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.collection-list {
  display: grid;
  gap: 6px;
  padding: 10px;
}

.collection-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: 8px;
}

.collection-item:hover {
  background: #f8fafc;
}

.collection-item.active {
  border-color: #dbe3ed;
  background: #e8eef5;
}

.collection-select {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #334155;
  text-align: left;
  font: inherit;
}

.collection-show {
  min-height: 36px;
  padding: 7px 11px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  font: inherit;
  font-size: .8rem;
  font-weight: 700;
}

.collection-show:hover {
  background: #f8fafc;
}

.collection-item-name {
  font-weight: 700;
}

.collection-item-meta {
  color: #64748b;
  font-size: .78rem;
}

.collection-editor {
  display: grid;
  gap: 18px;
  padding: 26px;
}

.editor-heading h2 {
  font-size: 1.35rem;
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
.field textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
}

.field input {
  min-height: 44px;
}

.field textarea {
  resize: vertical;
}

.stats-section {
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.stat-card {
  display: grid;
  gap: 4px;
  min-height: 112px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.stat-card span {
  color: #64748b;
  font-size: .78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.stat-card strong {
  color: #0f172a;
  font-size: 1.45rem;
}

.stat-card small,
.last-modified {
  color: #64748b;
  font-size: .78rem;
}

.warning-card strong {
  color: #92400e;
}

.last-modified {
  margin: 16px 0 0;
}

.last-modified strong {
  color: #334155;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
}

.primary-action,
.secondary-action,
.danger-action {
  min-height: 40px;
  padding: 8px 13px;
  border-radius: 7px;
  font-weight: 700;
}

.primary-action {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.primary-action:hover:not(:disabled) {
  background: #1d4ed8;
}

.secondary-action {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
}

.danger-action {
  border: 1px solid #fecaca;
  background: #ffffff;
  color: #b91c1c;
}

.empty-state {
  margin: 12px;
  color: #64748b;
  font-size: .9rem;
}

.error {
  margin: 0 0 18px;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 7px;
  background: #fef2f2;
  color: #991b1b;
}

@media (max-width: 760px) {
  .page-header {
    flex-direction: column;
  }

  .page-header .primary-action {
    width: 100%;
  }

  .collections-layout {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
