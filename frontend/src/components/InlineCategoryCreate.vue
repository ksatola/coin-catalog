<script setup lang="ts">
import { ref } from 'vue'

import type { CategoryGraphItem } from '../types'

const props = defineProps<{
  categories: CategoryGraphItem[]
}>()

const emit = defineEmits<{
  created: [category: CategoryGraphItem]
}>()

const isOpen = ref(false)
const name = ref('')
const description = ref('')
const parentIds = ref<number[]>([])
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
  parentIds.value = []
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

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const created = await response.json() as CategoryGraphItem

    for (const parentId of parentIds.value) {
      const relationResponse = await fetch(`/api/categories/${created.id}/parents/${parentId}`, {
        method: 'POST',
      })
      if (!relationResponse.ok) throw new Error(`HTTP ${relationResponse.status}`)
    }

    emit('created', {
      ...created,
      parent_ids: [...parentIds.value],
      child_ids: created.child_ids ?? [],
    })
    cancel()
  } catch {
    errorMessage.value = 'Nie udało się dodać kategorii.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="inline-create" :class="{ 'is-open': isOpen }">
    <button
      type="button"
      class="open-button"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      Dodaj kategorię
    </button>

    <div v-if="isOpen" class="editor">
      <label class="editor-field">
        <span>Nazwa nowej kategorii</span>
        <input v-model="name" type="text" autocomplete="off" />
      </label>

      <label class="editor-field">
        <span>Opis</span>
        <textarea v-model="description" rows="3" />
      </label>

      <label class="editor-field">
        <span>Rodzice</span>
        <select v-model="parentIds" multiple size="4">
          <option v-for="category in props.categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </label>

      <div class="editor-actions">
        <button type="button" class="editor-primary" :disabled="saving" @click="create">Dodaj</button>
        <button type="button" class="editor-secondary" :disabled="saving" @click="cancel">Anuluj</button>
      </div>
      <p v-if="errorMessage">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.inline-create {
  position: relative;
  display: grid;
  gap: 6px;
  margin-top: 2px;
  z-index: 30;
}

.inline-create.is-open {
  z-index: 1000;
}

.open-button {
  justify-self: start;
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid #0f172a;
  border-radius: 8px;
  background: #0f172a;
  color: #ffffff;
  font: inherit;
  font-size: .875rem;
  font-weight: 700;
  cursor: pointer;
}

.editor {
  position: relative;
  z-index: 1000;
  display: grid;
  gap: 12px;
  width: min(420px, 100%);
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.editor-field {
  display: grid;
  gap: 6px;
}

.editor-field span {
  color: #0f172a;
  font-size: .875rem;
  font-weight: 600;
}

.editor input,
.editor textarea,
.editor select {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
}

.editor input,
.editor textarea {
  padding: 10px 12px;
}

.editor input {
  min-height: 44px;
}

.editor textarea {
  min-height: 88px;
  resize: vertical;
}

.editor select {
  min-height: 120px;
  padding: 8px;
}

.editor input:focus-visible,
.editor textarea:focus-visible,
.editor select:focus-visible {
  outline: 3px solid rgba(59, 130, 246, .25);
  outline-offset: 2px;
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
  cursor: pointer;
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

.editor-actions button:disabled {
  cursor: default;
  opacity: .6;
}

.editor p {
  margin: 0;
  color: #991b1b;
  font-size: .8rem;
}
</style>
