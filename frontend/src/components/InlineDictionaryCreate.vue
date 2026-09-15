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
      :aria-expanded="isOpen"
      @click="toggle"
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
  margin-top: 4px;
  z-index: 30;
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
  position: absolute;
  top: 38px;
  right: 0;
  z-index: 1000;
  display: grid;
  width: min(280px, calc(100vw - 32px));
  gap: 10px;
  padding: 12px;
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
  color: #334155;
  font-size: .875rem;
  font-weight: 600;
}

.editor input {
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
}

.editor input:focus-visible {
  outline: 3px solid rgba(59, 130, 246, .25);
  outline-offset: 2px;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor button {
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

.editor button:disabled {
  cursor: default;
  opacity: .6;
}

.editor p {
  margin: 0;
  color: #991b1b;
  font-size: .8rem;
}
</style>
