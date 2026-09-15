<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CoinDetail from '../components/CoinDetail.vue'
import type { Coin } from '../types'

const route = useRoute()
const router = useRouter()

const coin = ref<Coin | null>(null)
const errorMessage = ref('')

async function loadCoin(): Promise<void> {
  try {
    const response = await fetch(`/api/coins/${route.params.id}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    coin.value = await response.json() as Coin
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Nie udało się pobrać monety.'
  }
}

async function archiveCoin(): Promise<void> {
  if (!coin.value) return

  try {
    const response = await fetch(`/api/coins/${coin.value.id}/archive`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    await loadCoin()
  } catch {
    errorMessage.value = 'Nie udało się zarchiwizować monety.'
  }
}

async function restoreCoin(): Promise<void> {
  if (!coin.value) return

  try {
    const response = await fetch(`/api/coins/${coin.value.id}/restore`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    await loadCoin()
  } catch {
    errorMessage.value = 'Nie udało się przywrócić monety.'
  }
}

onMounted(loadCoin)
</script>

<template>
  <section>
    <p v-if="errorMessage">{{ errorMessage }}</p>

    <template v-if="coin">
      <CoinDetail :coin="coin" />

      <div class="detail-actions">
        <template v-if="!coin.is_deleted">
          <button
            type="button"
            class="button button-primary"
            @click="router.push(`/monety/${coin.id}/edytuj`)"
          >
            Edytuj
          </button>

          <button type="button" class="button" @click="archiveCoin">
            Archiwizuj
          </button>
        </template>

        <button v-else type="button" class="button" @click="restoreCoin">
          Przywróć
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.button:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.button-primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.button-primary:hover {
  border-color: #1d4ed8;
  background: #1d4ed8;
}

@media (max-width: 600px) {
  .detail-actions {
    justify-content: stretch;
  }

  .detail-actions .button {
    flex: 1;
  }
}
</style>
