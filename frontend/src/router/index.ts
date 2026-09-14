import { createRouter, createWebHistory } from 'vue-router'

import ArchiveView from '../views/ArchiveView.vue'
import CoinCreateView from '../views/CoinCreateView.vue'
import CoinDetailView from '../views/CoinDetailView.vue'
import CoinEditView from '../views/CoinEditView.vue'
import CoinsView from '../views/CoinsView.vue'
import DictionariesView from '../views/DictionariesView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/monety',
    },
    {
      path: '/monety',
      component: CoinsView,
    },
    {
      path: '/monety/:id',
      component: CoinDetailView,
      props: true,
    },
    {
      path: '/monety/:id/edytuj',
      component: CoinEditView,
      props: true,
    },
    {
      path: '/dodaj',
      component: CoinCreateView,
    },
    {
      path: '/archiwum',
      component: ArchiveView,
    },
    {
      path: '/slowniki',
      component: DictionariesView,
    },
  ],
})

export default router
