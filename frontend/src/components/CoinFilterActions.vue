<script setup lang="ts">
defineEmits<{
  reset: []
  clearSorting: []
  collapse: []
}>()
</script>

<template>
  <div class="filter-actions">
    <button class="dialog-submit-button" type="submit">Szukaj / filtruj</button>
    <button class="dialog-reset-button" type="button" @click="$emit('reset')">Wyczyść filtry</button>
    <button class="dialog-reset-button" type="button" @click="$emit('clearSorting')">Wyczyść sortowanie</button>
    <button class="collapse-button" type="button" @click="$emit('collapse')">Zwiń</button>
  </div>
</template>

<style scoped>
.filter-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 10px;
}

.dialog-submit-button,
.dialog-reset-button,
.collapse-button {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.dialog-submit-button {
  border: 0;
  background: #2563eb;
  color: #fff;
}

.dialog-submit-button:hover {
  background: #1d4ed8;
}

.dialog-reset-button,
.collapse-button {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
}

.dialog-reset-button:hover,
.collapse-button:hover {
  background: #f8fafc;
}

.collapse-button {
  color: #334155;
  border-radius: 9px;
}

@media (max-width: 700px) {
  .filter-actions {
    flex-wrap: wrap;
  }
}
</style>
