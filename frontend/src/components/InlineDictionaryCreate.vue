<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  dictionaryName: string
  label: string
}>()

const emit = defineEmits<{
  created: [item: { id: number; name: string }]
}>()

const isOpen = ref(false)
const name = ref('')
const errorMessage = ref('')
const saving = ref(false)

function open(): void {
  isOpen.value = true
  errorMessage.value = ''
}

function cancel(): void {
  isOpen.value = false
  name.value = ''
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
    const response = await fetch(`/api/dictionaries/${props.dictionaryName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedName }),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const item = await response.json() as { id: number; name: string }
    emit('created', item)
    cancel()
  } catch {
    errorMessage.value = 'Nie udało się dodać wpisu.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="inline-create">
    <button
      type="button"
      class="add-button"
      :aria-label="`Dodaj ${label.toLowerCase()}`"
      :title="`Dodaj ${label.toLowerCase()}`"
      @click="open"
    >
      +
    </button>

    <div v-if="isOpen" class="editor">
      <div class="editor-field">
        <span>Nowy wpis w {{ label.toLowerCase() }}</span>
        <input
          v-model="name"
          type="text"
          autocomplete="off"
          :aria-label="`Nowy wpis w ${label.toLowerCase()}`"
          @keydown.enter.prevent="create"
        />
      </div>
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

.add-button {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 1.2rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
}

.editor {
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 1px solid #ddd;
  background: #ffffff;
}

.editor-field {
  display: grid;
  gap: 4px;
}

.editor button {
  margin-right: 8px;
}
</style>
