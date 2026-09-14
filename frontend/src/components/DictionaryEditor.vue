<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type DictionaryItem = {
  id: number
  name: string
}

const dictionaries = [
  { key: 'countries', label: 'Kraje' },
  { key: 'issuers', label: 'Emitenci' },
  { key: 'denominations', label: 'Nominały' },
  { key: 'mints', label: 'Mennice' },
  { key: 'materials', label: 'Materiały' },
  { key: 'states', label: 'Stany zachowania' },
  { key: 'eras', label: 'Ery' },
] as const

const selectedDictionary = ref<(typeof dictionaries)[number]['key']>('countries')
const items = ref<DictionaryItem[]>([])
const name = ref('')
const editingId = ref<number | null>(null)
const errorMessage = ref('')

const selectedLabel = computed(
  () => dictionaries.find((item) => item.key === selectedDictionary.value)?.label ?? '',
)

async function loadItems(): Promise<void> {
  const response = await fetch(`/api/dictionaries/${selectedDictionary.value}`)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  items.value = await response.json() as DictionaryItem[]
}

async function refresh(): Promise<void> {
  try {
    await loadItems()
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać słownika.'
  }
}

function startEdit(item: DictionaryItem): void {
  editingId.value = item.id
  name.value = item.name
}

function cancelEdit(): void {
  editingId.value = null
  name.value = ''
}

async function save(): Promise<void> {
  const trimmedName = name.value.trim()

  if (!trimmedName) {
    errorMessage.value = 'Nazwa nie może być pusta.'
    return
  }

  const isEditing = editingId.value !== null
  const url = isEditing
    ? `/api/dictionaries/${selectedDictionary.value}/${editingId.value}`
    : `/api/dictionaries/${selectedDictionary.value}`

  try {
    const response = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: trimmedName }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    cancelEdit()
    await refresh()
  } catch {
    errorMessage.value = 'Nie udało się zapisać wpisu.'
  }
}

async function deleteItem(item: DictionaryItem): Promise<void> {
  const confirmed = window.confirm(`Czy na pewno usunąć "${item.name}"?`)

  if (!confirmed) {
    return
  }

  try {
    const response = await fetch(
      `/api/dictionaries/${selectedDictionary.value}/${item.id}`,
      {
        method: 'DELETE',
      },
    )

    if (response.status === 409) {
      errorMessage.value =
        'Nie można usunąć wpisu, ponieważ jest używany przez monetę.'
      return
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    if (editingId.value === item.id) {
      cancelEdit()
    }

    await refresh()
  } catch {
    errorMessage.value = 'Nie udało się usunąć wpisu.'
  }
}

async function changeDictionary(
  dictionary: typeof dictionaries[number]['key'],
): Promise<void> {
  selectedDictionary.value = dictionary
  cancelEdit()
  await refresh()
}

onMounted(refresh)
</script>

<template>
  <section class="dictionary-editor">
    <h2>Słowniki</h2>

    <div class="dictionary-layout">
      <nav class="dictionary-menu">
        <button
          v-for="dictionary in dictionaries"
          :key="dictionary.key"
          type="button"
          :class="{ active: selectedDictionary === dictionary.key }"
          @click="changeDictionary(dictionary.key)"
        >
          {{ dictionary.label }}
        </button>
      </nav>

      <div class="dictionary-content">
        <div class="dictionary-header">
          <h3>{{ selectedLabel }}</h3>
        </div>

        <form class="dictionary-form" @submit.prevent="save">
          <input
            v-model="name"
            type="text"
            placeholder="Nazwa"
            autocomplete="off"
          />

          <button type="submit">
            {{ editingId === null ? 'Dodaj' : 'Zapisz' }}
          </button>

          <button
            v-if="editingId !== null"
            type="button"
            @click="cancelEdit"
          >
            Anuluj
          </button>
        </form>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <table>
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Akcje</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>{{ item.name }}</td>
              <td class="actions">
                <button type="button" @click="startEdit(item)">
                  Edytuj
                </button>

                <button type="button" @click="deleteItem(item)">
                  Usuń
                </button>
              </td>
            </tr>

            <tr v-if="items.length === 0">
              <td colspan="2">Brak wpisów.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dictionary-editor {
  margin-top: 2rem;
}

.dictionary-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 2rem;
}

.dictionary-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dictionary-menu button {
  text-align: left;
}

.dictionary-menu button.active {
  font-weight: 700;
}

.dictionary-form {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.dictionary-form input {
  flex: 1;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.75rem;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

.error {
  color: #b00020;
}
</style>
