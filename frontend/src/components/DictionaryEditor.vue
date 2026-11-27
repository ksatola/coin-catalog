<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

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
  { key: 'acquisition_methods', label: 'Sposoby nabycia' },
] as const

const selectedDictionary = ref<(typeof dictionaries)[number]['key']>('countries')
const items = ref<DictionaryItem[]>([])
const name = ref('')
const editingId = ref<number | null>(null)
const search = ref('')
const searchMode = ref<'include' | 'exclude'>('include')
const isDialogOpen = ref(false)
const dialog = ref<HTMLDialogElement | null>(null)
const errorMessage = ref('')
const isSaving = ref(false)

const selectedLabel = computed(
  () => dictionaries.find((item) => item.key === selectedDictionary.value)?.label ?? '',
)

const visibleItems = computed(() => {
  const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return items.value

  return items.value.filter((item) => {
    const normalizedName = item.name.toLocaleLowerCase()
    const matches = terms.every((term) => normalizedName.includes(term))
    return searchMode.value === 'include' ? matches : !matches
  })
})

async function loadItems(): Promise<void> {
  const response = await fetch(`/api/dictionaries/${selectedDictionary.value}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
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

function openCreateDialog(): void {
  editingId.value = null
  name.value = ''
  errorMessage.value = ''
  isDialogOpen.value = true
}

function startEdit(item: DictionaryItem): void {
  editingId.value = item.id
  name.value = item.name
  errorMessage.value = ''
  isDialogOpen.value = true
}

function closeDialog(): void {
  if (isSaving.value) return
  dialog.value?.close()
  isDialogOpen.value = false
  editingId.value = null
  name.value = ''
}

watch(isDialogOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    if (dialog.value && !dialog.value.open) dialog.value.showModal()
  } else if (dialog.value?.open) {
    dialog.value.close()
  }
})

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

  isSaving.value = true
  try {
    const response = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedName }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    dialog.value?.close()
    isDialogOpen.value = false
    editingId.value = null
    name.value = ''
    await refresh()
  } catch {
    errorMessage.value = 'Nie udało się zapisać wpisu.'
  } finally {
    isSaving.value = false
  }
}

async function deleteItem(item: DictionaryItem): Promise<void> {
  if (!window.confirm(`Czy na pewno usunąć "${item.name}"?`)) return

  try {
    const response = await fetch(
      `/api/dictionaries/${selectedDictionary.value}/${item.id}`,
      { method: 'DELETE' },
    )
    if (response.status === 409) {
      errorMessage.value = 'Nie można usunąć wpisu, ponieważ jest używany przez monetę.'
      return
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await refresh()
  } catch {
    errorMessage.value = 'Nie udało się usunąć wpisu.'
  }
}

async function changeDictionary(
  dictionary: typeof dictionaries[number]['key'],
): Promise<void> {
  selectedDictionary.value = dictionary
  search.value = ''
  searchMode.value = 'include'
  closeDialog()
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
            :aria-current="selectedDictionary === dictionary.key ? 'page' : undefined"
            @click="changeDictionary(dictionary.key)"
          >
            {{ dictionary.label }}
          </button>
        </nav>
      </aside>

      <section class="dictionary-content" aria-labelledby="dictionary-title">
        <header class="dictionary-header">
          <div>
            <p class="eyebrow">Słownik</p>
            <h2 id="dictionary-title">{{ selectedLabel }}</h2>
            <p class="item-count">{{ visibleItems.length }} z {{ items.length }} wpisów</p>
          </div>
          <button type="button" class="primary-action" @click="openCreateDialog">
            + Dodaj wpis
          </button>
        </header>

        <form class="dictionary-search" role="search" @submit.prevent>
          <label class="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              v-model="search"
              type="search"
              placeholder="Szukaj wpisów…"
              aria-label="Szukaj wpisów"
            />
          </label>
          <div class="search-mode" role="group" aria-label="Tryb wyszukiwania">
            <button
              type="button"
              :class="{ active: searchMode === 'include' }"
              :aria-pressed="searchMode === 'include'"
              aria-label="Uwzględnij dopasowania"
              title="Uwzględnij dopasowania"
              @click="searchMode = 'include'"
            >+</button>
            <button
              type="button"
              :class="{ active: searchMode === 'exclude' }"
              :aria-pressed="searchMode === 'exclude'"
              aria-label="Wyklucz dopasowania"
              title="Wyklucz dopasowania"
              @click="searchMode = 'exclude'"
            >−</button>
          </div>
        </form>

        <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Nazwa</th>
                <th class="actions-heading">Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in visibleItems" :key="item.id">
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
              <tr v-if="visibleItems.length === 0">
                <td colspan="2" class="empty-state">
                  {{ items.length === 0 ? 'Brak wpisów.' : 'Brak wpisów pasujących do wyszukiwania.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <dialog ref="dialog" class="dictionary-dialog" aria-labelledby="dictionary-dialog-title" @close="isDialogOpen = false">
      <form class="dialog-content" @submit.prevent="save">
        <header class="dialog-header">
          <h2 id="dictionary-dialog-title">{{ editingId === null ? 'Dodaj wpis' : 'Edytuj wpis' }}</h2>
          <button type="button" class="close-button" aria-label="Zamknij" @click="closeDialog">×</button>
        </header>
        <label for="dictionary-name">Nazwa</label>
        <input
          id="dictionary-name"
          v-model="name"
          type="text"
          placeholder="Nazwa"
          autocomplete="off"
          autofocus
        />
        <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
        <div class="dialog-actions">
          <button type="button" class="secondary-action" :disabled="isSaving" @click="closeDialog">
            Anuluj
          </button>
          <button type="submit" class="primary-action" :disabled="isSaving">
            {{ isSaving ? 'Zapisywanie…' : 'Zapisz' }}
          </button>
        </div>
      </form>
    </dialog>
  </section>
</template>

<style scoped>
.dictionary-editor { margin-top: 24px; }
.dictionary-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 24px; align-items: start; }
.dictionary-sidebar, .dictionary-content { border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; box-shadow: 0 2px 8px rgba(15,23,42,.06); }
.dictionary-sidebar { padding: 20px; }
.dictionary-sidebar h2, .dictionary-header h2 { margin: 0; color: #0f172a; }
.dictionary-sidebar h2 { margin-bottom: 16px; font-size: 1rem; }
.dictionary-menu { display: grid; gap: 6px; }
.dictionary-menu button { min-height: 42px; padding: 9px 12px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: #334155; font: inherit; font-size: .9rem; font-weight: 600; text-align: left; cursor: pointer; }
.dictionary-menu button:hover { background: #f8fafc; }
.dictionary-menu button.active { border-color: #dbe3ed; background: #e8eef5; color: #0f172a; font-weight: 700; }
.dictionary-content { min-width: 0; padding: 24px 26px; }
.dictionary-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.eyebrow { margin: 0 0 4px; color: #64748b; font-size: .75rem; font-weight: 700; letter-spacing: .04em; }
.dictionary-header h2 { font-size: 1.25rem; }
.item-count { margin: 5px 0 0; color: #64748b; font-size: .8rem; }
.dictionary-search { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.search-field { display: flex; flex: 1; align-items: center; gap: 10px; min-width: 0; min-height: 46px; padding: 0 13px; border: 1px solid #cbd5e1; border-radius: 9px; background: #fff; color: #64748b; }
.search-field:focus-within { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
.search-field span { font-size: 21px; }
.search-field input { width: 100%; min-width: 0; height: 44px; border: 0; outline: 0; background: transparent; color: #0f172a; font: inherit; }
.search-mode { display: flex; gap: 1px; padding: 3px; border: 1px solid #dbe3ee; border-radius: 9px; background: #f8fafc; }
.search-mode button { min-width: 36px; min-height: 36px; border: 0; border-radius: 6px; background: transparent; color: #64748b; font: inherit; font-size: 17px; cursor: pointer; }
.search-mode button.active { background: #e2e8f0; color: #0f172a; box-shadow: inset 0 0 0 1px #cbd5e1; }
.primary-action, .secondary-action, .danger-action { min-height: 40px; padding: 8px 13px; border-radius: 8px; font: inherit; font-size: .875rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
.primary-action { border: 1px solid #0f172a; background: #0f172a; color: #fff; }
.secondary-action { border: 1px solid #cbd5e1; background: #fff; color: #334155; }
.danger-action { border: 1px solid #fecaca; background: #fff; color: #991b1b; }
.primary-action:hover { background: #1e293b; }
.secondary-action:hover { background: #f8fafc; }
.danger-action:hover { background: #fef2f2; }
.table-card { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 13px 14px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: left; }
th { background: #f8fafc; color: #0f172a; font-size: .8rem; font-weight: 700; }
tbody tr:last-child td { border-bottom: 0; }
.actions-heading { width: 180px; }
.actions { display: flex; gap: 8px; }
.empty-state { color: #64748b; text-align: center; }
.error { margin: 0 0 16px; color: #991b1b; font-size: .875rem; }
.dictionary-dialog { width: min(480px, calc(100% - 32px)); max-width: 100%; padding: 0; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; color: #0f172a; box-shadow: 0 24px 60px rgba(15,23,42,.24); }
.dictionary-dialog::backdrop { background: rgba(15,23,42,.48); backdrop-filter: blur(2px); }
.dialog-content { display: grid; gap: 12px; padding: 24px; }
.dialog-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
.dialog-header h2 { margin: 0; font-size: 1.2rem; }
.close-button { width: 34px; height: 34px; border: 0; border-radius: 7px; background: transparent; color: #64748b; font-size: 25px; cursor: pointer; }
.dialog-content label { font-size: .875rem; font-weight: 600; }
.dialog-content input { box-sizing: border-box; width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; }
.dialog-content input:focus-visible { outline: 3px solid rgba(59,130,246,.25); outline-offset: 2px; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
button:disabled { opacity: .6; cursor: wait; }
@media (max-width: 760px) { .dictionary-layout { grid-template-columns: 1fr; } .dictionary-menu { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 520px) { .dictionary-content { padding: 20px; } .dictionary-menu { grid-template-columns: 1fr; } .dictionary-header { align-items: flex-start; flex-direction: column; } .dictionary-search { align-items: stretch; } .search-mode { align-items: center; } .actions { flex-wrap: wrap; } }
</style>
