<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ pixelsPerMm: number }>()
const emit = defineEmits<{ save: [pixelsPerMm: number]; close: [] }>()

const calibrationLengthMm = 100
const pixelsPerMm = ref(props.pixelsPerMm)
const previewWidth = computed(() => Math.round(calibrationLengthMm * pixelsPerMm.value))

function save(): void {
  if (!Number.isFinite(pixelsPerMm.value) || pixelsPerMm.value <= 0) return
  emit('save', pixelsPerMm.value)
}
</script>

<template>
  <div class="calibration-backdrop" role="presentation" @click.self="emit('close')">
    <section class="calibration-dialog" role="dialog" aria-modal="true" aria-labelledby="screen-calibration-title">
      <header class="calibration-header">
        <div>
          <h2 id="screen-calibration-title">Kalibracja ekranu</h2>
          <p>Ustaw linię tak, aby miała dokładnie 100 mm na ekranie.</p>
        </div>
        <button type="button" aria-label="Zamknij kalibrację" @click="emit('close')">×</button>
      </header>

      <div class="calibration-ruler">
        <div class="ruler-line" :style="{ width: previewWidth + 'px' }"><span>100 mm</span></div>
        <div class="ruler-labels" :style="{ '--ruler-width': `${previewWidth}px` }"><span>0</span><span>100 mm</span></div>
      </div>

      <label class="calibration-input">
        <span>Piksele CSS na 1 mm</span>
        <input v-model.number="pixelsPerMm" type="number" min="1" max="12" step="0.01" />
      </label>

      <input
        v-model.number="pixelsPerMm"
        class="calibration-slider"
        type="range"
        min="1"
        max="12"
        step="0.01"
        aria-label="Piksele CSS na milimetr"
      />

      <p class="calibration-help">
        Przyłóż linijkę do ekranu. Zwiększ wartość, jeśli linia jest za krótka; zmniejsz, jeśli jest za długa.
      </p>

      <footer class="calibration-actions">
        <button type="button" @click="emit('close')">Anuluj</button>
        <button type="button" class="primary" @click="save">Zapisz kalibrację</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.calibration-backdrop { position: fixed; z-index: 100; inset: 0; display: grid; padding: 20px; place-items: center; background: rgb(15 23 42 / 45%); }
.calibration-dialog { width: min(720px, 100%); padding: 24px; border: 1px solid #dbe3ee; border-radius: 12px; background: #ffffff; box-shadow: 0 18px 50px rgb(15 23 42 / 20%); }
.calibration-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.calibration-header h2 { margin: 0; color: #0f172a; font-size: 20px; }
.calibration-header p, .calibration-help { margin: 6px 0 0; color: #64748b; font-size: 14px; line-height: 1.45; }
.calibration-header > button { border: 0; background: transparent; color: #64748b; cursor: pointer; font-size: 24px; line-height: 1; }
.calibration-ruler { overflow-x: auto; margin: 32px 0 22px; padding: 24px 0 8px; }
.ruler-line { position: relative; min-width: 120px; height: 18px; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; box-sizing: border-box; }
.ruler-line::before, .ruler-line::after { position: absolute; top: -7px; width: 2px; height: 28px; background: #0f172a; content: ''; }
.ruler-line::before { left: 0; } .ruler-line::after { right: 0; }
.ruler-line span { position: absolute; top: -27px; left: 50%; color: #334155; font-size: 12px; transform: translateX(-50%); }
.ruler-labels { position: relative; width: max(120px, var(--ruler-width)); min-width: var(--ruler-width); color: #64748b; font-size: 11px; }
.calibration-input { display: grid; gap: 6px; color: #334155; font-size: 13px; font-weight: 600; }
.calibration-input input { width: 190px; max-width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; }
.calibration-slider { width: 100%; margin: 14px 0 0; }
.calibration-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.calibration-actions button { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; cursor: pointer; }
.calibration-actions .primary { border-color: #2563eb; background: #2563eb; color: #ffffff; }
</style>
