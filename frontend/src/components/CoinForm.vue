<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'

import type { Coin, CoinCreate } from '../types'

type DictionaryItem = {
  id: number
  name: string
}

type Dictionaries = {
  countries: DictionaryItem[]
  issuers: DictionaryItem[]
  denominations: DictionaryItem[]
  mints: DictionaryItem[]
  materials: DictionaryItem[]
  states: DictionaryItem[]
  eras: DictionaryItem[]
}

const props = defineProps<{
  coin?: Coin | null
}>()

const emit = defineEmits<{
  submit: [coin: CoinCreate]
  cancel: []
}>()

const emptyForm: CoinCreate = {
  country_id: 0,
  issuer_id: null,
  denomination_id: 0,
  from_year: 0,
  from_era_id: 0,
  to_year: 0,
  to_era_id: 0,
  mint_id: null,
  material_id: null,
  state_id: null,
  description: null,
  weight: null,
  diameter: null,
  has_video: false,
  source: null,
}

const form = reactive<CoinCreate>({ ...emptyForm })

const dictionaries = reactive<Dictionaries>({
  countries: [],
  issuers: [],
  denominations: [],
  mints: [],
  materials: [],
  states: [],
  eras: [],
})

const validationMessage = ref('')
const loadErrorMessage = ref('')

const isEditing = () => props.coin !== null && props.coin !== undefined

function loadCoinIntoForm(coin: Coin | null | undefined): void {
  Object.assign(form, coin ? { ...coin } : { ...emptyForm })
  validationMessage.value = ''
}

async function loadDictionary(
  dictionaryName: keyof Dictionaries,
): Promise<DictionaryItem[]> {
  const response = await fetch(`/api/dictionaries/${dictionaryName}`)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return await response.json() as DictionaryItem[]
}

async function loadDictionaries(): Promise<void> {
  try {
    const [
      countries,
      issuers,
      denominations,
      mints,
      materials,
      states,
      eras,
    ] = await Promise.all([
      loadDictionary('countries'),
      loadDictionary('issuers'),
      loadDictionary('denominations'),
      loadDictionary('mints'),
      loadDictionary('materials'),
      loadDictionary('states'),
      loadDictionary('eras'),
    ])

    dictionaries.countries = countries
    dictionaries.issuers = issuers
    dictionaries.denominations = denominations
    dictionaries.mints = mints
    dictionaries.materials = materials
    dictionaries.states = states
    dictionaries.eras = eras
    loadErrorMessage.value = ''
  } catch {
    loadErrorMessage.value = 'Nie udało się pobrać słowników.'
  }
}

function submitForm(): void {
  if (
    !form.country_id ||
    !form.denomination_id ||
    !form.from_era_id ||
    !form.to_era_id
  ) {
    validationMessage.value = 'Uzupełnij wymagane pola.'
    return
  }

  if (form.from_year > form.to_year) {
    validationMessage.value =
      'Rok początkowy nie może być późniejszy niż końcowy.'
    return
  }

  validationMessage.value = ''
  emit('submit', { ...form })
}

watch(() => props.coin, loadCoinIntoForm, { immediate: true })

onMounted(loadDictionaries)
</script>

<template>
  <form @submit.prevent="submitForm">
    <h2>{{ isEditing() ? 'Edytuj monetę' : 'Dodaj monetę' }}</h2>

    <p v-if="loadErrorMessage">{{ loadErrorMessage }}</p>

    <label>
      Kraj
      <select v-model.number="form.country_id" required>
        <option :value="0">Wybierz kraj</option>
        <option
          v-for="item in dictionaries.countries"
          :key="item.id"
          :value="item.id"
        >
          {{ item.name }}
        </option>
      </select>
    </label>

    <label>
      Emitent
      <select v-model="form.issuer_id">
        <option :value="null">— brak —</option>
        <option
          v-for="item in dictionaries.issuers"
          :key="item.id"
          :value="item.id"
        >
          {{ item.name }}
        </option>
      </select>
    </label>

    <label>
      Nominał
      <select v-model.number="form.denomination_id" required>
        <option :value="0">Wybierz nominał</option>
        <option
          v-for="item in dictionaries.denominations"
          :key="item.id"
          :value="item.id"
        >
          {{ item.name }}
        </option>
      </select>
    </label>

    <label>
      Era od
      <select v-model.number="form.from_era_id" required>
        <option :value="0">Wybierz erę</option>
        <option
          v-for="item in dictionaries.eras"
          :key="item.id"
          :value="item.id"
        >
          {{ item.name }}
        </option>
      </select>
    </label>

    <label>
      Rok od
      <input v-model.number="form.from_year" type="number" required />
    </label>

    <label>
      Era do
      <select v-model.number="form.to_era_id" required>
        <option :value="0">Wybierz erę</option>
        <option
          v-for="item in dictionaries.eras"
          :key="item.id"
          :value="item.id"
        >
          {{ item.name }}
        </option>
      </select>
    </label>

    <label>
      Rok do
      <input v-model.number="form.to_year" type="number" required />
    </label>

    <label>
      Mennica
      <select v-model="form.mint_id">
        <option :value="null">— brak —</option>
        <option
          v-for="item in dictionaries.mints"
          :key="item.id"
          :value="item.id"
        >
          {{ item.name }}
        </option>
      </select>
    </label>

    <label>
      Materiał
      <select v-model="form.material_id">
        <option :value="null">— brak —</option>
        <option
          v-for="item in dictionaries.materials"
          :key="item.id"
          :value="item.id"
        >
          {{ item.name }}
        </option>
      </select>
    </label>

    <label>
      Stan zachowania
      <select v-model="form.state_id">
        <option :value="null">— brak —</option>
        <option
          v-for="item in dictionaries.states"
          :key="item.id"
          :value="item.id"
        >
          {{ item.name }}
        </option>
      </select>
    </label>

    <label>
      Waga [g]
      <input
        v-model.number="form.weight"
        type="number"
        step="0.001"
        min="0"
      />
    </label>

    <label>
      Średnica [mm]
      <input
        v-model.number="form.diameter"
        type="number"
        step="0.01"
        min="0"
      />
    </label>

    <label>
      Źródło
      <input v-model="form.source" type="text" />
    </label>

    <label>
      Opis
      <textarea v-model="form.description" />
    </label>

    <label>
      <input v-model="form.has_video" type="checkbox" />
      Ma wideo
    </label>

    <button type="submit">
      {{ isEditing() ? 'Zapisz zmiany' : 'Dodaj monetę' }}
    </button>

    <button v-if="isEditing()" type="button" @click="emit('cancel')">
      Anuluj
    </button>

    <p v-if="validationMessage">{{ validationMessage }}</p>
  </form>
</template>
