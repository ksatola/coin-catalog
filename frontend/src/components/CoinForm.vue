<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

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

const props = defineProps<{ coin?: Coin | null; imageCoinId?: number }>()
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
  collection_number: null,
  has_video: false,
  source: null,
}

const form = reactive<CoinCreate>({ ...emptyForm })
const dictionaries = reactive<Dictionaries>({ countries: [], issuers: [], denominations: [], mints: [], materials: [], states: [], eras: [] })
const locallyCreatedDictionaryItems: Record<keyof Dictionaries, Set<number>> = {
  countries: new Set(),
  issuers: new Set(),
  denominations: new Set(),
  mints: new Set(),
  materials: new Set(),
  states: new Set(),
  eras: new Set(),
}
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
  await refreshCoinImages(coin.id)
}

async function refreshCoinImages(coinId: number): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${coinId}/images`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const images = await response.json() as CoinImage[]
    const deletedKeys = new Set(pendingDeletedImages.value.map((image) => `${image.kind}:${image.sort_order}`))

    if (!pendingFiles.avers) primaryImages.avers = images.find((image) => image.kind === 'avers') ?? null
    if (!pendingFiles.rewers) primaryImages.rewers = images.find((image) => image.kind === 'rewers') ?? null
    additionalImages.value = images.filter(
      (image) => image.kind === 'additional' && !deletedKeys.has(`${image.kind}:${image.sort_order}`),
    )
    imageErrorMessage.value = ''
  } catch {
    imageErrorMessage.value = 'Nie udało się pobrać zdjęć monety.'
  }
}

function imageUrl(image: CoinImage | null): string | null {
  const imageCoinId = props.imageCoinId ?? props.coin?.id
  if (!image || !imageCoinId) return null
  return `/api/coins/${imageCoinId}/images/${image.id}/file`
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

function mergeLoadedDictionaryItems(name: keyof Dictionaries, loadedItems: DictionaryItem[]): void {
  const createdItems = dictionaries[name].filter((item) => locallyCreatedDictionaryItems[name].has(item.id))
  const itemsById = new Map(loadedItems.map((item) => [item.id, item]))
  for (const item of createdItems) itemsById.set(item.id, item)
  dictionaries[name] = [...itemsById.values()]
}

async function loadDictionaries(): Promise<void> {
  try {
    const [countries, issuers, denominations, mints, materials, states, eras] = await Promise.all([
      loadDictionary('countries'), loadDictionary('issuers'), loadDictionary('denominations'),
      loadDictionary('mints'), loadDictionary('materials'), loadDictionary('states'), loadDictionary('eras'),
    ])
    mergeLoadedDictionaryItems('countries', countries)
    mergeLoadedDictionaryItems('issuers', issuers)
    mergeLoadedDictionaryItems('denominations', denominations)
    mergeLoadedDictionaryItems('mints', mints)
    mergeLoadedDictionaryItems('materials', materials)
    mergeLoadedDictionaryItems('states', states)
    mergeLoadedDictionaryItems('eras', eras)
    loadErrorMessage.value = ''
  } catch {
    loadErrorMessage.value = 'Nie udało się pobrać słowników.'
  }
}

async function addDictionaryItem(name: keyof Dictionaries, item: DictionaryItem): Promise<void> {
  locallyCreatedDictionaryItems[name].add(item.id)
  if (!dictionaries[name].some((existingItem) => existingItem.id === item.id)) dictionaries[name].push(item)
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
  await nextTick()
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

function handleEnterKey(event: KeyboardEvent): void {
  if (event.target instanceof HTMLTextAreaElement) return
  event.preventDefault()
}

function loadCoinIntoForm(coin: Coin | null | undefined): void {
  markClean()
  Object.assign(form, coin ? { ...coin } : { ...emptyForm })
  validationMessage.value = ''
  void loadCoinImages(coin)
}

watch(() => props.coin, loadCoinIntoForm, { immediate: true })
watch(() => props.imageCoinId, (coinId) => {
  if (coinId && coinId !== props.coin?.id) void refreshCoinImages(coinId)
})
watch(form, () => {
  markDirty()
}, { deep: true })
onMounted(loadDictionaries)
onBeforeUnmount(revokePendingAdditionalPreviewUrls)
</script>

<template>
  <form class="coin-form" @submit.prevent="submitForm" @keydown.enter="handleEnterKey">
    <header class="form-header">
      <h2>{{ isEditing() ? 'Edytuj monetę' : 'Dodaj monetę' }}</h2>
    </header>

    <div v-if="loadErrorMessage" class="form-message form-message-error">{{ loadErrorMessage }}</div>
    <div v-if="imageErrorMessage" class="form-message form-message-error">{{ imageErrorMessage }}</div>

    <section class="form-section image-section">
      <div class="section-heading"><h3>Zdjęcia</h3></div>

      <div class="primary-image-fields">
        <article class="primary-image-card">
          <h4>Awers</h4>
          <CoinImageDropZone title="Awers" :preview-url="imageUrl(primaryImages.avers)" @files="setPrimaryFile('avers', $event)" @clear="clearPrimary('avers')" />
        </article>
        <article class="primary-image-card">
          <h4>Rewers</h4>
          <CoinImageDropZone title="Rewers" :preview-url="imageUrl(primaryImages.rewers)" @files="setPrimaryFile('rewers', $event)" @clear="clearPrimary('rewers')" />
        </article>
      </div>

      <div class="additional-image-section">
        <div class="section-heading section-heading-small"><h3>Zdjęcia dodatkowe</h3></div>
        <div class="additional-image-controls">
          <div class="additional-upload-card">
            <CoinImageDropZone title="Dodaj zdjęcia" multiple :pending-count="pendingFiles.additional.length" @files="addAdditionalFiles" />
          </div>
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
    </section>

    <section class="form-section">
      <div class="section-heading"><h3>Informacje</h3></div>
      <div class="info-grid">
        <div class="field-card"><label for="country">Kraj</label><div class="select-with-add"><select id="country" v-model.number="form.country_id" required @click.stop><option :value="0">Wybierz kraj</option><option v-for="item in dictionaries.countries" :key="item.id" :value="item.id">{{ item.name }}</option></select><InlineDictionaryCreate dictionary-name="countries" label="kraj" @created="addDictionaryItem('countries', $event)" /></div></div>
        <div class="field-card"><label for="issuer">Emitent</label><div class="select-with-add"><select id="issuer" v-model="form.issuer_id" @click.stop><option :value="null">— brak —</option><option v-for="item in dictionaries.issuers" :key="item.id" :value="item.id">{{ item.name }}</option></select><InlineDictionaryCreate dictionary-name="issuers" label="emitenta" @created="addDictionaryItem('issuers', $event)" /></div></div>
        <div class="field-card denomination-field"><label for="denomination">Nominał</label><div class="select-with-add"><select id="denomination" v-model.number="form.denomination_id" required @click.stop><option :value="0">Wybierz nominał</option><option v-for="item in dictionaries.denominations" :key="item.id" :value="item.id">{{ item.name }}</option></select><InlineDictionaryCreate dictionary-name="denominations" label="nominał" @created="addDictionaryItem('denominations', $event)" /></div></div>
        <div class="field-card field-card-wide"><div class="date-fields"><div><label for="from-era">Era od</label><div class="select-with-add"><select id="from-era" v-model.number="form.from_era_id" required @click.stop><option :value="0">Wybierz erę</option><option v-for="item in dictionaries.eras" :key="item.id" :value="item.id">{{ item.name }}</option></select><InlineDictionaryCreate dictionary-name="eras" label="erę" @created="addDictionaryItem('eras', $event)" /></div></div><label>Rok od <input v-model.number="form.from_year" type="number" required /></label></div></div>
        <div class="field-card field-card-wide"><div class="date-fields"><div><label for="to-era">Era do</label><div class="select-with-add"><select id="to-era" v-model.number="form.to_era_id" required @click.stop><option :value="0">Wybierz erę</option><option v-for="item in dictionaries.eras" :key="item.id" :value="item.id">{{ item.name }}</option></select><InlineDictionaryCreate dictionary-name="eras" label="erę" @created="addDictionaryItem('eras', $event)" /></div></div><label>Rok do <input v-model.number="form.to_year" type="number" required /></label></div></div>
        <div class="field-card"><label for="mint">Mennica</label><div class="select-with-add"><select id="mint" v-model="form.mint_id" @click.stop><option :value="null">— brak —</option><option v-for="item in dictionaries.mints" :key="item.id" :value="item.id">{{ item.name }}</option></select><InlineDictionaryCreate dictionary-name="mints" label="mennicę" @created="addDictionaryItem('mints', $event)" /></div></div>
        <div class="field-card"><label for="material">Materiał</label><div class="select-with-add"><select id="material" v-model="form.material_id" @click.stop><option :value="null">— brak —</option><option v-for="item in dictionaries.materials" :key="item.id" :value="item.id">{{ item.name }}</option></select><InlineDictionaryCreate dictionary-name="materials" label="materiał" @created="addDictionaryItem('materials', $event)" /></div></div>
        <div class="field-card"><label for="state">Stan zachowania</label><div class="select-with-add"><select id="state" v-model="form.state_id" @click.stop><option :value="null">— brak —</option><option v-for="item in dictionaries.states" :key="item.id" :value="item.id">{{ item.name }}</option></select><InlineDictionaryCreate dictionary-name="states" label="stan" @created="addDictionaryItem('states', $event)" /></div></div>
        <label class="field-card">Waga [g] <input v-model.number="form.weight" type="number" step="0.001" min="0" /></label>
        <label class="field-card">Średnica [mm] <input v-model.number="form.diameter" type="number" step="0.01" min="0" /></label>
        <label class="field-card collection-number-field" for="collection-number">Numer kolekcji <input id="collection-number" v-model="form.collection_number" type="text" /></label>
      </div>
    </section>

    <section class="form-section">
      <div class="section-heading"><h3>Źródło i opis</h3></div>
      <div class="text-fields">
        <label class="field-card">Źródło<textarea v-model="form.source" rows="4" /></label>
        <label class="field-card">Opis<textarea v-model="form.description" /></label>
      </div>
    </section>

    <label class="video-option"><input v-model="form.has_video" type="checkbox" /><span>Ma wideo</span></label>
    <div v-if="validationMessage" class="form-message form-message-warning">{{ validationMessage }}</div>
    <footer class="form-actions">
      <button type="button" class="secondary-action" @click="emit('cancel')">Anuluj</button>
      <button type="submit" class="primary-action">{{ isEditing() ? 'Zapisz zmiany' : 'Dodaj monetę' }}</button>
    </footer>
  </form>
</template>

<style scoped>
.coin-form { display: grid; gap: 24px; max-width: 1200px; margin: 0 auto; padding: 24px 0 40px; }
.form-header { display: flex; align-items: center; justify-content: space-between; }
.form-header h2 { margin: 0; font-size: 1.75rem; line-height: 1.2; }
.form-section { display: grid; gap: 18px; padding: 24px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04); }
.section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
.section-heading h3 { margin: 0; font-size: 1.1rem; }
.section-heading span { color: #64748b; font-size: .875rem; }
.section-heading-small h3 { font-size: 1rem; }
.primary-image-fields { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; }
.primary-image-card { display: grid; gap: 10px; min-width: 0; padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
.primary-image-card h4 { margin: 0; font-size: .95rem; }
.primary-image-card :deep(.image-drop-zone) { width: 100%; height: min(36vw,420px); min-height: 280px; aspect-ratio: auto; border-color: #cbd5e1; border-radius: 8px; background: #fff; }
.primary-image-card :deep(.image-drop-zone.has-image) { background: #fff; }
.primary-image-card :deep(.preview-image) { width: 100%; height: 100%; object-fit: contain; border-radius: 8px; }
.additional-image-section { display: grid; gap: 12px; padding-top: 4px; }
.additional-image-controls { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.additional-upload-card { flex: 0 0 140px; box-sizing: border-box; width: 140px; height: 176px; padding: 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: flex-start; justify-content: center; }
.additional-upload-card :deep(.image-drop-zone) { width: 122px; height: 120px; min-height: 120px; aspect-ratio: auto; box-sizing: border-box; }
.additional-image-list { display: flex; flex: 1 1 400px; flex-wrap: wrap; gap: 12px; }
.additional-image-card { width: 140px; height: 176px; box-sizing: border-box; margin: 0; padding: 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.additional-image-card img { display: block; width: 122px; height: 100px; object-fit: contain; border-radius: 6px; background: #fff; }
.additional-image-card figcaption { margin-top: 6px; font-size: .75rem; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.additional-image-card button { margin-top: 6px; padding: 5px 8px; font-size: .75rem; }
.info-grid { display: grid; grid-template-columns: repeat(6,minmax(0,1fr)); gap: 16px; }
.field-card { display: grid; align-content: start; gap: 8px; min-width: 0; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; color: #334155; font-weight: 600; }
.info-grid > .field-card:nth-child(1),.info-grid > .field-card:nth-child(2) { grid-column: span 3; }
.info-grid > .denomination-field { grid-column: span 2; }
.info-grid > .field-card-wide { grid-column: span 2; }
.info-grid > .field-card:nth-child(6),.info-grid > .field-card:nth-child(7) { grid-column: span 3; }
.info-grid > .field-card:nth-child(8),.info-grid > .field-card:nth-child(9),.info-grid > .field-card:nth-child(10) { grid-column: span 2; }
.collection-number-field { grid-column: span 2; }
.field-card input,.field-card select,.field-card textarea { box-sizing: border-box; width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #0f172a; font: inherit; font-weight: 400; }
.field-card textarea { min-height: 160px; resize: vertical; }
.select-with-add { display: grid; grid-template-columns: minmax(0,1fr) 32px; gap: 8px; align-items: start; }
.select-with-add :deep(.inline-create) { margin-top: 0; }
.date-fields { display: grid; grid-template-columns: minmax(0,1fr) 110px; gap: 12px; align-items: start; }
.date-fields > div,.date-fields > label { display: grid; gap: 8px; }
.date-fields label { color: #334155; font-weight: 600; }
.date-fields input,.date-fields select { box-sizing: border-box; width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #0f172a; font: inherit; font-weight: 400; }
.text-fields { display: grid; gap: 16px; }
.text-fields .field-card:last-child { min-height: 190px; }
.video-option { display: inline-flex; align-items: center; justify-self: start; gap: 10px; padding: 12px 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 9px; color: #334155; font-weight: 600; }
.video-option input { width: 18px; height: 18px; margin: 0; }
.form-message { padding: 12px 14px; border-radius: 8px; font-size: .9rem; }
.form-message-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.form-message-warning { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.form-actions button { min-height: 44px; padding: 10px 18px; border-radius: 8px; font: inherit; font-weight: 700; cursor: pointer; }
.secondary-action { border: 1px solid #cbd5e1; background: #fff; color: #334155; }
.primary-action { border: 1px solid #0f172a; background: #0f172a; color: #fff; }
.coin-form :deep(button:focus-visible),.coin-form input:focus-visible,.coin-form select:focus-visible,.coin-form textarea:focus-visible { outline: 3px solid rgba(59,130,246,.25); outline-offset: 2px; }
@media (max-width:800px) {
  .coin-form { padding: 16px 0 32px; }
  .form-section { padding: 18px; }
  .primary-image-fields,.info-grid { grid-template-columns: 1fr; }
  .info-grid > .field-card,.info-grid > .field-card-wide,.info-grid > .denomination-field { grid-column: auto; }
  .collection-number-field { grid-column: auto; }
  .date-fields { grid-template-columns: 1fr; }
  .primary-image-card :deep(.image-drop-zone) { height: min(70vw,360px); min-height: 240px; }
}
@media (max-width:520px) {
  .section-heading { display: grid; gap: 4px; }
  .additional-upload-card { flex-basis: 100%; width: 140px; }
  .additional-image-list { flex-basis: 100%; }
  .form-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .form-actions button { width: 100%; }
}
</style>
