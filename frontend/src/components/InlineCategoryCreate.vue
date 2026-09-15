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

function open(): void {
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

    const created = await response.json() as { id: number; name: string; description: string | null }

    for (const parentId of parentIds.value) {
      const relationResponse = await fetch(`/api/categories/${created.id}/parents/${parentId}`, {
        method: 'POST',
      })
      if (!relationResponse.ok) throw new Error(`HTTP ${relationResponse.status}`)
    }

    const categoryResponse = await fetch('/api/categories', { cache: 'no-store' })
    if (!categoryResponse.ok) throw new Error(`HTTP ${categoryResponse.status}`)
    const categories = await categoryResponse.json() as CategoryGraphItem[]
    const category = categories.find((item) => item.id === created.id)
    if (!category) throw new Error('Created category not found')

    emit('created', category)
    cancel()
  } catch {
    errorMessage.value = 'Nie udało się dodać kategorii.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="inline-create">
    <button type="button" @click="open">+ Dodaj kategorię</button>

    <div v-if="isOpen" class="editor">
      <label>
        Nazwa nowej kategorii
        <input v-model="name" type="text" autocomplete="off" />
      </label>

      <label>
        Opis
        <textarea v-model="description" rows="3" />
      </label>

      <label>
        Rodzice
        <select v-model="parentIds" multiple size="4">
          <option v-for="category in props.categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </label>

      <div>
        <button type="button" :disabled="saving" @click="create">Dodaj</button>
        <button type="button" :disabled="saving" @click="cancel">Anuluj</button>
      </div>
      <p v-if="errorMessage">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.inline-create {
  display: grid;
  gap: 6px;
  margin-top: 4px;
}

.editor {
  display: grid;
  gap: 8px;
  padding: 8px;
  border: 1px solid #ddd;
}

.editor label {
  display: grid;
  gap: 4px;
}

.editor button {
  margin-right: 8px;
}
</style>
