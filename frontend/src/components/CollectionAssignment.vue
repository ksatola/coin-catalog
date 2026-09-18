<script setup lang="ts">
import { ref } from 'vue'

import type { Collection } from '../types'

const props = defineProps<{
  collections: Collection[]
  mode: 'create' | 'edit'
  selectedCollectionId: number
  savedCollectionId: number
  savingCollection: boolean
}>()

const emit = defineEmits<{
  'update:selectedCollectionId': [id: number]
  created: [collection: Collection]
  save: []
}>()

const isOpen = ref(false)
const name = ref('')
const description = ref('')
const errorMessage = ref('')
const saving = ref(false)

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
    const response = await fetch('/api/collections', {
      method: 'POST',
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

    const created = await response.json() as Collection
    emit('created', created)
    emit('update:selectedCollectionId', created.id)
    cancel()
  } catch {
    errorMessage.value = 'Nie udało się dodać kolekcji.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="collection-card">
    <div>
      <h2>Kolekcja</h2>
      <p>Każda moneta należy do dokładnie jednej kolekcji.</p>
    </div>

    <label class="collection-field">
      <span>Wybierz kolekcję</span>
      <select
        :value="props.selectedCollectionId"
        required
        @change="emit('update:selectedCollectionId', Number(($event.target as HTMLSelectElement).value))"
      >
        <option :value="0">Wybierz kolekcję</option>
        <option v-for="collection in props.collections" :key="collection.id" :value="collection.id">
          {{ collection.name }}
        </option>
      </select>
    </label>

    <div class="collection-actions">
      <button type="button" class="open-button" :aria-expanded="isOpen" @click="toggle">
        Dodaj kolekcję
      </button>

      <button
        v-if="props.mode === 'edit'"
        type="button"
        class="save-button"
        :disabled="props.selectedCollectionId === props.savedCollectionId || props.savingCollection"
        @click="emit('save')"
      >
        {{ props.savingCollection ? 'Zapisywanie…' : 'Zapisz kolekcję' }}
      </button>
    </div>

    <div v-if="isOpen" class="editor">
      <label class="editor-field">
        <span>Nazwa nowej kolekcji</span>
        <input v-model="name" type="text" autocomplete="off" />
      </label>

      <label class="editor-field">
        <span>Opis</span>
        <textarea v-model="description" rows="3" />
      </label>

      <div class="editor-actions">
        <button type="button" class="editor-primary" :disabled="saving" @click="create">Dodaj</button>
        <button type="button" class="editor-secondary" :disabled="saving" @click="cancel">Anuluj</button>
      </div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>
  </section>
</template>

<style scoped>
.collection-card {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 24px 26px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.collection-card h2 {
  margin: 0 0 4px;
  color: #0f172a;
  font-size: 1.1rem;
}

.collection-card p {
  margin: 0;
  color: #64748b;
  font-size: .85rem;
}

.collection-field,
.editor-field {
  display: grid;
  gap: 6px;
}

.collection-field span,
.editor-field span {
  color: #0f172a;
  font-size: .875rem;
  font-weight: 600;
}

.collection-field select,
.editor input,
.editor textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  padding: 9px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
}

.collection-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.save-button,
.open-button {
  justify-self: start;
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
  color: #ffffff;
}

.save-button:disabled {
  border-color: #cbd5e1;
  background: #e2e8f0;
  color: #64748b;
}

.open-button {
  border: 1px solid #0f172a;
  background: #0f172a;
  color: #ffffff;
}

.editor {
  display: grid;
  gap: 12px;
  width: min(420px, 100%);
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
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
  color: #ffffff;
}

.editor-secondary {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
}

.editor p.error {
  color: #991b1b;
  font-size: .8rem;
}
</style>
