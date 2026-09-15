<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import CoinImageDropZone from './CoinImageDropZone.vue'
import InlineDictionaryCreate from './InlineDictionaryCreate.vue'
import type { Coin, CoinCreate, CoinFormSubmit, CoinImage } from '../types'
import { useUnsavedCoinForm } from '../composables/useUnsavedCoinForm'

type DictionaryItem = { id: number; name: string }
type Dictionaries = {
  countries: DictionaryItem[]
  issuers: DictionaryItem[]
  denominations: DictionaryItem[]
  mints: DictionaryItem[]
  materials: DictionaryItem[]
  states: DictionaryItem[]
  eras: DictionaryItem[]
}

const props = defineProps<{ coin?: Coin | null }>()
const emit = defineEmits<{ submit: [payload: CoinFormSubmit]; cancel: [] }>()
const { markDirty, markClean } = useUnsavedCoinForm()

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
const dictionaries = reactive<Dictionaries>({ countries: [], issuers: [], denominations: [], mints: [], materials: [], states: [], eras: [] })
const primaryImages = reactive<{ avers: CoinImage | null; rewers: CoinImage | null }>({ avers: null, rewers: null })
const additionalImages = ref<CoinImage[]>([])
const pendingDeletedImages = ref<CoinImage[]>([])
const pendingFiles = reactive<{ avers: File | null; rewers: File | null; additional: File[] }>({ avers: null, rewers: null, additional: [] })
const pendingAdditionalPreviewUrls = ref<string[]>([])
const validationMessage = ref('')
const loadErrorMessage = ref('')
const imageErrorMessage = ref('')

const isEditing = () => props.coin !== null && props.coin !== undefined

function revokePendingAdditionalPreviewUrls(): void {
  for (const url of pendingAdditionalPreviewUrls.value) URL.revokeObjectURL(url)
  pendingAdditionalPreviewUrls.value = []
}

function rebuildPendingAdditionalPreviewUrls(): void {
  revokePendingAdditionalPreviewUrls()
  pendingAdditionalPreviewUrls.value = pendingFiles.additional.map((file) => URL.createObjectURL(file))
}

function clearImages(): void {
  primaryImages.avers = null
  primaryImages.rewers = null
  additionalImages.value = []
  pendingDeletedImages.value = []
  pendingFiles.avers = null
  pendingFiles.rewers = null
  pendingFiles.additional = []
  revokePendingAdditionalPreviewUrls()
  imageErrorMessage.value = ''
}

async function loadCoinImages(coin: Coin | null | undefined): Promise<void> {
  clearImages()
  if (!coin) return
  try {
    const response = await fetch(`/api/coins/${coin.id}/images`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const images = await response.json() as CoinImage[]
    primaryImages.avers = images.find((image) => image.kind === 'avers') ?? null
    primaryImages.rewers = images.find((image) => image.kind === 'rewers') ?? null
    additionalImages.value = images.filter((image) => image.kind === 'additional')
  } catch {
    imageErrorMessage.value = 'Nie udało się pobrać zdjęć monety.'
  }
}

function imageUrl(image: CoinImage | null): string | null {
  if (!image || !props.coin) return null
  return `/api/coins/${props.coin.id}/images/${image.id}/file`
}

function setPrimaryFile(kind: 'avers' | 'rewers', files: File[]): void {
  pendingFiles[kind] = files[0] ?? null
  primaryImages[kind] = null
  markDirty()
}

function clearPrimary(kind: 'avers' | 'rewers'): void {
  pendingFiles[kind] = null
  primaryImages[kind] = null
  markDirty()
}

function addAdditionalFiles(files: File[]): void {
  pendingFiles.additional.push(...files)
  rebuildPendingAdditionalPreviewUrls()
  markDirty()
}

function removePendingAdditional(index: number): void {
  pendingFiles.additional.splice(index, 1)
  rebuildPendingAdditionalPreviewUrls()
  markDirty()
}

function removeAdditionalImage(image: CoinImage): void {
  if (!window.confirm(`Czy na pewno usunąć zdjęcie „${image.filename}”?`)) return
  pendingDeletedImages.value.push(image)
  additionalImages.value = additionalImages.value.filter((item) => item.id !== image.id)
  imageErrorMessage.value = ''
  markDirty()
}

async function loadDictionary(dictionaryName: keyof Dictionaries): Promise<DictionaryItem[]> {
  const response = await fetch(`/api/dictionaries/${dictionaryName}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return await response.json() as DictionaryItem[]
}

async function loadDictionaries(): Promise<void> {
  try {
    const [countries, issuers, denominations, mints, materials, states, eras] = await Promise.all([
      loadDictionary('countries'), loadDictionary('issuers'), loadDictionary('denominations'),
      loadDictionary('mints'), loadDictionary('materials'), loadDictionary('states'), loadDictionary('eras'),
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

function addDictionaryItem(name: keyof Dictionaries, item: DictionaryItem): void {
  dictionaries[name].push(item)
  if (name === 'countries') form.country_id = item.id
  if (name === 'issuers') form.issuer_id = item.id
  if (name === 'denominations') form.denomination_id = item.id
  if (name === 'mints') form.mint_id = item.id
  if (name === 'materials') form.material_id = item.id
  if (name === 'states') form.state_id = item.id
  if (name === 'eras') {
    if (!form.from_era_id) form.from_era_id = item.id
    else form.to_era_id = item.id
  }
  markDirty()
}

function submitForm(): void {
  if (!form.country_id || !form.denomination_id || !form.from_era_id || !form.to_era_id) {
    validationMessage.value = 'Uzupełnij wymagane pola.'
    return
  }
  if (!primaryImages.avers && !pendingFiles.avers) {
    validationMessage.value = 'Dodaj zdjęcie awersu.'
    return
  }
  if (!primaryImages.rewers && !pendingFiles.rewers) {
    validationMessage.value = 'Dodaj zdjęcie rewersu.'
    return
  }
  validationMessage.value = ''
  emit('submit', {
    coin: { ...form },
    images: {
      avers: pendingFiles.avers,
      rewers: pendingFiles.rewers,
      additional: [...pendingFiles.additional],
      additionalDeletes: [...pendingDeletedImages.value],
    },
  })
}

function loadCoinIntoForm(coin: Coin | null | undefined): void {
  markClean()
  Object.assign(form, coin ? { ...coin } : { ...emptyForm })
  validationMessage.value = ''
  void loadCoinImages(coin)
}

watch(() => props.coin, loadCoinIntoForm, { immediate: true })
watch(form, () => {
  markDirty()
}, { deep: true })
onMounted(loadDictionaries)
onBeforeUnmount(revokePendingAdditionalPreviewUrls)
</script>

<template>
  <form @submit.prevent="submitForm">
    <h2>{{ isEditing() ? 'Edytuj monetę' : 'Dodaj monetę' }}</h2>
    <p v-if="loadErrorMessage">{{ loadErrorMessage }}</p>
    <p v-if="imageErrorMessage">{{ imageErrorMessage }}</p>

    <div class="primary-image-fields">
      <CoinImageDropZone title="Awers" :preview-url="imageUrl(primaryImages.avers)" @files="setPrimaryFile('avers', $event)" @clear="clearPrimary('avers')" />
      <CoinImageDropZone title="Rewers" :preview-url="imageUrl(primaryImages.rewers)" @files="setPrimaryFile('rewers', $event)" @clear="clearPrimary('rewers')" />
    </div>

    <div class="additional-image-section">
      <h3>Zdjęcia dodatkowe</h3>
      <div class="additional-image-controls">
        <CoinImageDropZone title="Dodaj zdjęcia" multiple :pending-count="pendingFiles.additional.length" @files="addAdditionalFiles" />
        <div v-if="additionalImages.length || pendingAdditionalPreviewUrls.length" class="additional-image-list">
          <figure v-for="image in additionalImages" :key="`existing-${image.id}`" class="additional-image-card">
            <img :src="imageUrl(image) ?? undefined" :alt="image.filename" />
            <figcaption>{{ image.filename }}</figcaption>
            <button type="button" @click="removeAdditionalImage(image)">Usuń</button>
          </figure>
          <figure v-for="(url, index) in pendingAdditionalPreviewUrls" :key="`pending-${index}`" class="additional-image-card">
            <img :src="url" :alt="pendingFiles.additional[index]?.name" />
            <figcaption>{{ pendingFiles.additional[index]?.name }}</figcaption>
            <button type="button" @click="removePendingAdditional(index)">Usuń</button>
          </figure>
        </div>
      </div>
    </div>

    <label>Kraj
      <select v-model.number="form.country_id" required>
        <option :value="0">Wybierz kraj</option>
        <option v-for="item in dictionaries.countries" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
      <InlineDictionaryCreate dictionary-name="countries" label="kraj" @created="addDictionaryItem('countries', $event)" />
    </label>

    <label>Emitent
      <select v-model="form.issuer_id"><option :value="null">— brak —</option><option v-for="item in dictionaries.issuers" :key="item.id" :value="item.id">{{ item.name }}</option></select>
      <InlineDictionaryCreate dictionary-name="issuers" label="emitenta" @created="addDictionaryItem('issuers', $event)" />
    </label>

    <label>Nominał
      <select v-model.number="form.denomination_id" required><option :value="0">Wybierz nominał</option><option v-for="item in dictionaries.denominations" :key="item.id" :value="item.id">{{ item.name }}</option></select>
      <InlineDictionaryCreate dictionary-name="denominations" label="nominał" @created="addDictionaryItem('denominations', $event)" />
    </label>

    <label>Era od
      <select v-model.number="form.from_era_id" required><option :value="0">Wybierz erę</option><option v-for="item in dictionaries.eras" :key="item.id" :value="item.id">{{ item.name }}</option></select>
      <InlineDictionaryCreate dictionary-name="eras" label="erę" @created="addDictionaryItem('eras', $event)" />
    </label>

    <label>Rok od <input v-model.number="form.from_year" type="number" required /></label>

    <label>Era do
      <select v-model.number="form.to_era_id" required><option :value="0">Wybierz erę</option><option v-for="item in dictionaries.eras" :key="item.id" :value="item.id">{{ item.name }}</option></select>
      <InlineDictionaryCreate dictionary-name="eras" label="erę" @created="addDictionaryItem('eras', $event)" />
    </label>

    <label>Rok do <input v-model.number="form.to_year" type="number" required /></label>

    <label>Mennica
      <select v-model="form.mint_id"><option :value="null">— brak —</option><option v-for="item in dictionaries.mints" :key="item.id" :value="item.id">{{ item.name }}</option></select>
      <InlineDictionaryCreate dictionary-name="mints" label="mennicę" @created="addDictionaryItem('mints', $event)" />
    </label>

    <label>Materiał
      <select v-model="form.material_id"><option :value="null">— brak —</option><option v-for="item in dictionaries.materials" :key="item.id" :value="item.id">{{ item.name }}</option></select>
      <InlineDictionaryCreate dictionary-name="materials" label="materiał" @created="addDictionaryItem('materials', $event)" />
    </label>

    <label>Stan zachowania
      <select v-model="form.state_id"><option :value="null">— brak —</option><option v-for="item in dictionaries.states" :key="item.id" :value="item.id">{{ item.name }}</option></select>
      <InlineDictionaryCreate dictionary-name="states" label="stan" @created="addDictionaryItem('states', $event)" />
    </label>

    <label>Waga [g] <input v-model.number="form.weight" type="number" step="0.001" min="0" /></label>
    <label>Średnica [mm] <input v-model.number="form.diameter" type="number" step="0.01" min="0" /></label>
    <label>Źródło <input v-model="form.source" type="text" /></label>
    <label>Opis <textarea v-model="form.description" /></label>
    <label><input v-model="form.has_video" type="checkbox" /> Ma wideo</label>

    <button type="submit">{{ isEditing() ? 'Zapisz zmiany' : 'Dodaj monetę' }}</button>
    <button type="button" @click="emit('cancel')">Anuluj</button>
    <p v-if="validationMessage">{{ validationMessage }}</p>
  </form>
</template>

<style scoped>
.primary-image-fields { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
.additional-image-section { margin-bottom: 24px; }
.additional-image-controls { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
.additional-image-list { display: flex; flex-wrap: wrap; gap: 12px; }
.additional-image-card { width: 140px; margin: 0; }
.additional-image-card img { display: block; width: 100%; height: 100px; object-fit: contain; border: 1px solid #d1d5db; border-radius: 6px; background: #f8fafc; }
.additional-image-card figcaption { margin-top: 4px; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.additional-image-card button { margin-top: 6px; }
</style>
