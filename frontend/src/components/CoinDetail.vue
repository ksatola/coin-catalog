<script setup lang="ts">
import { onMounted, reactive } from 'vue'

import type { Coin } from '../types'

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

defineProps<{
  coin: Coin
}>()

const dictionaries = reactive<Dictionaries>({
  countries: [],
  issuers: [],
  denominations: [],
  mints: [],
  materials: [],
  states: [],
  eras: [],
})

function dictionaryName(
  items: DictionaryItem[],
  id: number | null,
): string {
  if (id === null) {
    return '—'
  }

  return items.find((item) => item.id === id)?.name ?? `#${id}`
}

async function loadDictionary(
  dictionaryNameKey: keyof Dictionaries,
): Promise<DictionaryItem[]> {
  const response = await fetch(`/api/dictionaries/${dictionaryNameKey}`)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return await response.json() as DictionaryItem[]
}

async function loadDictionaries(): Promise<void> {
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
}

onMounted(loadDictionaries)
</script>

<template>
  <section>
    <h1>Szczegóły monety #{{ coin.id }}</h1>

    <dl>
      <dt>Kraj</dt>
      <dd>{{ dictionaryName(dictionaries.countries, coin.country_id) }}</dd>

      <dt>Emitent</dt>
      <dd>{{ dictionaryName(dictionaries.issuers, coin.issuer_id) }}</dd>

      <dt>Nominał</dt>
      <dd>
        {{ dictionaryName(dictionaries.denominations, coin.denomination_id) }}
      </dd>

      <dt>Era od</dt>
      <dd>{{ dictionaryName(dictionaries.eras, coin.from_era_id) }}</dd>

      <dt>Rok od</dt>
      <dd>{{ coin.from_year }}</dd>

      <dt>Era do</dt>
      <dd>{{ dictionaryName(dictionaries.eras, coin.to_era_id) }}</dd>

      <dt>Rok do</dt>
      <dd>{{ coin.to_year }}</dd>

      <dt>Mennica</dt>
      <dd>{{ dictionaryName(dictionaries.mints, coin.mint_id) }}</dd>

      <dt>Materiał</dt>
      <dd>{{ dictionaryName(dictionaries.materials, coin.material_id) }}</dd>

      <dt>Stan zachowania</dt>
      <dd>{{ dictionaryName(dictionaries.states, coin.state_id) }}</dd>

      <dt>Waga</dt>
      <dd>{{ coin.weight ?? '—' }} g</dd>

      <dt>Średnica</dt>
      <dd>{{ coin.diameter ?? '—' }} mm</dd>

      <dt>Wideo</dt>
      <dd>{{ coin.has_video ? 'Tak' : 'Nie' }}</dd>

      <dt>Źródło</dt>
      <dd>{{ coin.source ?? '—' }}</dd>

      <dt>Opis</dt>
      <dd>{{ coin.description ?? '—' }}</dd>

      <dt>Status</dt>
      <dd>{{ coin.is_deleted ? 'Zarchiwizowana' : 'Aktywna' }}</dd>
    </dl>
  </section>
</template>
