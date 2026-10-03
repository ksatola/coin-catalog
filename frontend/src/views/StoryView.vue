<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StoryTree from '../components/StoryTree.vue'
import StoryRenderer from '../components/StoryRenderer.vue'
import type { StoryPage, StoryPageTree } from '../types'
const route = useRoute()
const router = useRouter()
const tree = ref<StoryPageTree[]>([])
const page = ref<StoryPage | null>(null)
const error = ref('')
function currentPath(): string {
  const value = route.params.pathMatch
  return Array.isArray(value) ? value.join('/') : String(value ?? '')
}
async function loadTree(): Promise<void> {
  const response = await fetch('/api/story/pages/tree', { cache:'no-store' })
  if (!response.ok) throw new Error('HTTP ' + response.status)
  tree.value = await response.json() as StoryPageTree[]
}
async function loadPage(): Promise<void> {
  const path = currentPath()
  if (!path) { page.value=null; return }
  const response = await fetch('/api/story/pages/path/' + path, { cache:'no-store' })
  if (!response.ok) throw new Error('HTTP ' + response.status)
  page.value = await response.json() as StoryPage
}
async function reload(): Promise<void> {
  error.value=''
  try { await Promise.all([loadTree(), loadPage()]) } catch { error.value='Nie udało się wczytać Opowieści.' }
}
async function move(id:number, direction:'up'|'down'): Promise<void> {
  const response = await fetch('/api/story/pages/' + id + '/reorder', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ direction }) })
  if (!response.ok) { error.value='Nie udało się zmienić kolejności.'; return }
  await reload()
}
function findNode(nodes: StoryPageTree[], id: number): StoryPageTree | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = findNode(node.children, id)
    if (child) return child
  }
  return null
}
async function remove(id:number): Promise<void> {
  const node = findNode(tree.value, id)
  if (!node || !window.confirm(`Usunąć stronę „${node.title}”?`)) return

  const response = await fetch('/api/story/pages/' + id, { method:'DELETE' })
  if (!response.ok) {
    error.value = response.status === 409
      ? 'Nie można usunąć strony, która ma podstrony.'
      : 'Nie udało się usunąć strony.'
    return
  }

  if (page.value?.id === id) {
    await router.push('/opowiesc')
  } else {
    await reload()
  }
}
function select(path:string):void { void router.push('/opowiesc/' + path) }
function edit(id:number):void { void router.push('/opowiesc/edytuj/' + id) }
watch(() => route.fullPath, () => void reload())
onMounted(() => void reload())
</script>
<template>
  <section class="story-layout">
    <aside class="sidebar">
      <div class="sidebar-header"><h1>Opowieść</h1><RouterLink to="/opowiesc/edytuj/nowa">+ Nowa strona</RouterLink></div>
      <StoryTree :nodes="tree" :active-path="page?.path" @select="select" @edit="edit" @move="move" @delete="remove" />
    </aside>
    <main class="reader">
      <p v-if="error" class="error">{{ error }}</p>
      <template v-else-if="page"><nav class="breadcrumb">{{ page.path.replaceAll('/', ' / ') }}</nav><h2>{{ page.title }}</h2><StoryRenderer :content="page.content" :embedded-coins="page.embedded_coins" /></template>
      <div v-else class="empty">Wybierz stronę z drzewa.</div>
    </main>
  </section>
</template>
<style scoped>
.story-layout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:24px}.sidebar,.reader{border:1px solid #dbe3ee;border-radius:10px;background:white;padding:18px}.sidebar{align-self:start}.sidebar-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.sidebar-header h1{margin:0;font-size:22px}.sidebar-header a{font-size:13px;color:#2563eb;text-decoration:none}.breadcrumb{color:#64748b;font-size:13px}.error{color:#b91c1c}.empty{color:#64748b;padding:40px 0}@media(max-width:800px){.story-layout{grid-template-columns:1fr}}
</style>
