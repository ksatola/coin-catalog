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
    <div class="dictionary-layout">
      <aside class="dictionary-sidebar">
        <h2>Słowniki</h2>
        <nav class="dictionary-menu" aria-label="Słowniki">
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
      </aside>

      <section class="dictionary-content" aria-labelledby="dictionary-title">
        <div class="dictionary-header">
          <div>
            <p class="eyebrow">Słownik</p>
            <h2 id="dictionary-title">{{ selectedLabel }}</h2>
          </div>
        </div>

        <form class="dictionary-form" @submit.prevent="save">
          <label for="dictionary-name">{{ editingId === null ? 'Nowy wpis' : 'Edytowany wpis' }}</label>
          <div class="dictionary-form-row">
            <input
              id="dictionary-name"
              v-model="name"
              type="text"
              placeholder="Nazwa"
              autocomplete="off"
            />
            <button type="submit" class="primary-action">
              {{ editingId === null ? 'Dodaj' : 'Zapisz' }}
            </button>
            <button
              v-if="editingId !== null"
              type="button"
              class="secondary-action"
              @click="cancelEdit"
            >
              Anuluj
            </button>
          </div>
        </form>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Nazwa</th>
                <th class="actions-heading">Akcje</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td>{{ item.name }}</td>
                <td class="actions">
                  <button type="button" class="secondary-action" @click="startEdit(item)">
                    Edytuj
                  </button>
                  <button type="button" class="danger-action" @click="deleteItem(item)">
                    Usuń
                  </button>
                </td>
              </tr>

              <tr v-if="items.length === 0">
                <td colspan="2" class="empty-state">Brak wpisów.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.dictionary-editor {
  margin-top: 24px;
}

.dictionary-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.dictionary-sidebar,
.dictionary-content {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.dictionary-sidebar {
  padding: 20px;
}

.dictionary-sidebar h2,
.dictionary-header h2 {
  margin: 0;
  color: #0f172a;
}

.dictionary-sidebar h2 {
  margin-bottom: 16px;
  font-size: 1rem;
}

.dictionary-menu {
  display: grid;
  gap: 6px;
}

.dictionary-menu button {
  min-height: 42px;
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

.dictionary-menu button:hover {
  background: #f8fafc;
}

.dictionary-menu button.active {
  border-color: #dbe3ed;
  background: #e8eef5;
  color: #0f172a;
  font-weight: 700;
}

.dictionary-content {
  min-width: 0;
  padding: 24px 26px;
}

.dictionary-header {
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #64748b;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .04em;
}

.dictionary-header h2 {
  font-size: 1.25rem;
}

.dictionary-form {
  display: grid;
  gap: 7px;
  margin-bottom: 20px;
}

.dictionary-form label {
  color: #0f172a;
  font-size: .875rem;
  font-weight: 600;
}

.dictionary-form-row {
  display: flex;
  gap: 8px;
}

.dictionary-form input {
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
}

.dictionary-form input:focus-visible {
  outline: 3px solid rgba(59, 130, 246, .25);
  outline-offset: 2px;
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

.table-card {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 13px 14px;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
  text-align: left;
}

th {
  background: #f8fafc;
  color: #0f172a;
  font-size: .8rem;
  font-weight: 700;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.actions-heading {
  width: 180px;
}

.actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  color: #64748b;
  text-align: center;
}

.error {
  margin: 0 0 16px;
  color: #991b1b;
  font-size: .875rem;
}

@media (max-width: 760px) {
  .dictionary-layout {
    grid-template-columns: 1fr;
  }

  .dictionary-menu {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .dictionary-content {
    padding: 20px;
  }

  .dictionary-menu {
    grid-template-columns: 1fr;
  }

  .dictionary-form-row {
    flex-wrap: wrap;
  }

  .dictionary-form input {
    flex-basis: 100%;
  }
}
</style>
