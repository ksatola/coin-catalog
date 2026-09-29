<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CoinDetail from '../components/CoinDetail.vue'
import { buildCoinFilterQuery, parseCoinFilterQuery } from '../composables/useCoinFilters'
import type { Coin } from '../types'

const route = useRoute()
const router = useRouter()

const coin = ref<Coin | null>(null)
const navigationCoins = ref<Coin[]>([])
const errorMessage = ref('')
const applyCurrentFilters = ref(Boolean(window.location.search))

function navigationQuery(): string {
  if (applyCurrentFilters.value) {
    const filters = parseCoinFilterQuery(window.location.search)
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
  const query = navigationQuery()
  return `/monety/${coinId}${query ? `?${query}` : ''}`
}

const currentNavigationIndex = () => navigationCoins.value.findIndex((item) => item.id === coin.value?.id)
const previousCoin = () => {
  const index = currentNavigationIndex()
  return index > 0 ? navigationCoins.value[index - 1] ?? null : null
}
const nextCoin = () => {
  const index = currentNavigationIndex()
  return index >= 0 && index < navigationCoins.value.length - 1
    ? navigationCoins.value[index + 1] ?? null
    : null
}

async function loadNavigationCoins(): Promise<void> {
  try {
    const query = navigationQuery()
    const response = await fetch(`/api/coins?${query}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    navigationCoins.value = await response.json() as Coin[]
  } catch {
    navigationCoins.value = []
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
    await loadNavigationCoins()
  } catch {
    coin.value = null
    navigationCoins.value = []
    errorMessage.value = 'Nie udało się pobrać monety.'
  }
}

function goToCoin(target: Coin | null): void {
  if (!target) return
  void router.push(detailPath(target.id))
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
  if (coin.value) void loadNavigationCoins()
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
          :disabled="!previousCoin()"
          @click="goToCoin(previousCoin())"
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
          :disabled="!nextCoin()"
          @click="goToCoin(nextCoin())"
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
