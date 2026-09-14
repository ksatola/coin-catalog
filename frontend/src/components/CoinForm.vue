<script setup lang="ts">
import { reactive, ref } from 'vue'

import type { CoinCreate } from '../types'

const emit = defineEmits<{
  submit: [coin: CoinCreate]
}>()

const form = reactive<CoinCreate>({
  country_id: 1,
  issuer_id: null,
  denomination_id: 1,
  from_year: 1900,
  from_era_id: 1,
  to_year: 1900,
  to_era_id: 1,
  mint_id: null,
  material_id: null,
  state_id: null,
  description: null,
  weight: null,
  diameter: null,
  has_video: false,
  source: null,
})

const validationMessage = ref('')

function submitForm(): void {
  if (!form.country_id || !form.denomination_id || !form.from_era_id || !form.to_era_id) {
    validationMessage.value = 'Uzupełnij wymagane pola.'
    return
  }

  if (form.from_year > form.to_year) {
    validationMessage.value = 'Rok początkowy nie może być późniejszy niż końcowy.'
    return
  }

  validationMessage.value = ''
  emit('submit', { ...form })
}
</script>

<template>
  <form @submit.prevent="submitForm">
    <h2>Dodaj monetę</h2>

    <label>
      Kraj ID
      <input v-model.number="form.country_id" type="number" min="1" required />
    </label>

    <label>
      Nominał ID
      <input v-model.number="form.denomination_id" type="number" min="1" required />
    </label>

    <label>
      Era od ID
      <input v-model.number="form.from_era_id" type="number" min="1" required />
    </label>

    <label>
      Rok od
      <input v-model.number="form.from_year" type="number" required />
    </label>

    <label>
      Era do ID
      <input v-model.number="form.to_era_id" type="number" min="1" required />
    </label>

    <label>
      Rok do
      <input v-model.number="form.to_year" type="number" required />
    </label>

    <label>
      Opis
      <textarea v-model="form.description" />
    </label>

    <button type="submit">Dodaj monetę</button>

    <p v-if="validationMessage">{{ validationMessage }}</p>
  </form>
</template>
