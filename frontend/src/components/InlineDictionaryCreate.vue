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
  gap: 8px;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
}

.editor-field {
  display: grid;
  gap: 4px;
}

.editor-field span {
  color: #334155;
  font-size: .85rem;
  font-weight: 600;
}

.editor input {
  box-sizing: border-box;
  width: 100%;
  min-height: 36px;
  padding: 7px 9px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
}

.editor button {
  margin-right: 8px;
}

.editor p {
  margin: 0;
  color: #991b1b;
  font-size: .8rem;
}
</style>
