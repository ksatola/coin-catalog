import { createRouter, createWebHistory } from 'vue-router'

import ArchiveView from '../views/ArchiveView.vue'
import CategoriesView from '../views/CategoriesView.vue'
import CoinCreateView from '../views/CoinCreateView.vue'
import CoinDetailView from '../views/CoinDetailView.vue'
import CoinEditView from '../views/CoinEditView.vue'
import CoinsView from '../views/CoinsView.vue'
import DictionariesView from '../views/DictionariesView.vue'
import { useUnsavedCoinForm } from '../composables/useUnsavedCoinForm'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/monety' },
    { path: '/monety', component: CoinsView },
    { path: '/monety/:id', component: CoinDetailView },
    { path: '/monety/:id/edytuj', component: CoinEditView },
    { path: '/dodaj', component: CoinCreateView },
    { path: '/archiwum', component: ArchiveView },
    { path: '/slowniki', component: DictionariesView },
    { path: '/kategorie', component: CategoriesView },
  ],
})

router.beforeEach((to, from) => {
  const { isDirty, markClean } = useUnsavedCoinForm()
  const isCoinForm = from.path === '/dodaj' || /^\/monety\/[^/]+\/edytuj$/.test(from.path)

  if (isCoinForm && isDirty.value && to.path !== from.path) {
    const shouldLeave = window.confirm(
      'Masz niezapisane dane formularza. Czy na pewno chcesz opuścić stronę i je utracić?',
    )

    if (!shouldLeave) return false

    markClean()
  }

  return true
})

export default router
