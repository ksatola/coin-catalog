<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CoinDetail from '../components/CoinDetail.vue'
import { buildCoinFilterQuery, parseCoinFilterQuery } from '../composables/useCoinFilters'
import type { Coin } from '../types'

const route = useRoute()
const router = useRouter()

const coin = ref<Coin | null>(null)
const previousCoinId = ref<number | null>(null)
const nextCoinId = ref<number | null>(null)
const errorMessage = ref('')
const applyCurrentFilters = ref(window.location.search ? new URLSearchParams(window.location.search).get('apply_filters') !== 'false' : false)

function filterContextQuery(): string {
  const params = new URLSearchParams(window.location.search)
  params.delete('apply_filters')
  return params.toString()
}

function navigationQuery(): string {
  if (applyCurrentFilters.value) {
    const params = new URLSearchParams(window.location.search)
    params.delete('apply_filters')
    const filters = parseCoinFilterQuery(params)
    return buildCoinFilterQuery(filters)
  }

  const status = coin.value?.is_deleted ? 'archived' : 'active'
  const params = new URLSearchParams()
  params.set('status', status)
  params.set('sort_by', 'id')
  params.set('sort_order', 'asc')
  return params.toString()
}

function detailPath(coinId: number): string {
  const query = filterContextQuery()
  const params = new URLSearchParams(query)
  params.set('apply_filters', String(applyCurrentFilters.value))
  const navigationQueryString = params.toString()
  return `/monety/${coinId}${navigationQueryString ? `?${navigationQueryString}` : ''}`
}

async function loadNavigation(): Promise<void> {
  previousCoinId.value = null
  nextCoinId.value = null

  try {
    const query = navigationQuery()
    const response = await fetch(`/api/coins/${coin.value?.id}/navigation?${query}`, {
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const navigation = await response.json() as {
      previous_id: number | null
      next_id: number | null
    }
    previousCoinId.value = navigation.previous_id
    nextCoinId.value = navigation.next_id
  } catch {
    previousCoinId.value = null
    nextCoinId.value = null
  }
}

async function loadCoin(): Promise<void> {
  const coinId = route.params.id

  try {
    const response = await fetch(`/api/coins/${coinId}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    coin.value = await response.json() as Coin
    errorMessage.value = ''
    await loadNavigation()
  } catch {
    coin.value = null
    previousCoinId.value = null
    nextCoinId.value = null
    errorMessage.value = 'Nie udało się pobrać monety.'
  }
}

function goToCoin(coinId: number | null): void {
  if (coinId === null) return
  void router.push(detailPath(coinId))
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

watch(applyCurrentFilters, () => {
  if (coin.value) void loadNavigation()
})

watch(() => route.fullPath, () => {
  void loadCoin()
})

onMounted(loadCoin)
</script>

<template>
  <section>
    <p v-if="errorMessage">{{ errorMessage }}</p>

    <template v-if="coin">
      <nav class="coin-navigation" aria-label="Nawigacja między monetami">
        <button
          type="button"
          class="navigation-button"
          :disabled="previousCoinId === null"
          @click="goToCoin(previousCoinId)"
        >
          ← Poprzednia
        </button>

        <label class="filter-navigation">
          <input v-model="applyCurrentFilters" type="checkbox" />
          <span>Zastosuj aktualne filtry</span>
        </label>

        <button
          type="button"
          class="navigation-button"
          :disabled="nextCoinId === null"
          @click="goToCoin(nextCoinId)"
        >
          Następna →
        </button>
      </nav>

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
.coin-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid #dbe3ee;
  border-radius: 9px;
  background: #ffffff;
}

.navigation-button {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.navigation-button:hover:not(:disabled) {
  border-color: #94a3b8;
  background: #f8fafc;
}

.navigation-button:disabled {
  cursor: default;
  opacity: 0.45;
}

.filter-navigation {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.filter-navigation input {
  width: 16px;
  height: 16px;
  margin: 0;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 28px;
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
  .coin-navigation {
    align-items: stretch;
    flex-direction: column;
  }

  .coin-navigation .navigation-button,
  .filter-navigation {
    justify-content: center;
  }

  .detail-actions {
    justify-content: stretch;
  }

  .detail-actions .button {
    flex: 1;
  }
}
</style>
