<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import StoryRenderer from './StoryRenderer.vue'
import StoryCoinPicker from './StoryCoinPicker.vue'
import type { StoryPage, StoryPageTree } from '../types'

const props = defineProps<{ page: StoryPage | null; tree: StoryPageTree[] }>()
const emit = defineEmits<{ save: [payload: { title: string; parent_id: number | null; content: string }] }>()

const title = ref('')
const parentId = ref<number | null>(null)
const content = ref('')
const mobileTab = ref<'markdown' | 'preview'>('markdown')
const showCoinPicker = ref(false)
const contentInput = ref<HTMLTextAreaElement | null>(null)

const parentOptions = computed(() => {
  const options: Array<{ id:number; label:string }> = []
  function visit(nodes: StoryPageTree[], prefix=''): void {
    for (const node of nodes) {
      if (node.id !== props.page?.id) {
        options.push({ id: node.id, label: prefix + node.title })
        visit(node.children, prefix + '— ')
      }
    }
  }
  visit(props.tree)
  return options
})

function insertCoin(id: number): void {
  const token = '{{ coin:' + id + ' }}'
  const start = contentInput.value?.selectionStart ?? content.value.length
  const end = contentInput.value?.selectionEnd ?? start
  content.value = content.value.slice(0, start) + token + content.value.slice(end)
  showCoinPicker.value = false
}

watch(() => props.page, (page) => {
  title.value = page?.title ?? ''
  parentId.value = page?.parent_id ?? null
  content.value = page?.content ?? ''
}, { immediate:true })
</script>

<template>
  <form class="editor" @submit.prevent="emit('save', { title, parent_id: parentId, content })">
    <label>Tytuł<input v-model="title" required /></label>
    <label>Rodzic<select v-model="parentId"><option :value="null">Korzeń</option><option v-for="option in parentOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>

    <div class="mobile-tabs" role="tablist" aria-label="Edytor Opowieści">
      <button type="button" :aria-selected="mobileTab === 'markdown'" @click="mobileTab='markdown'">Markdown</button>
      <button type="button" :aria-selected="mobileTab === 'preview'" @click="mobileTab='preview'">Podgląd</button>
    </div>

    <div class="editor-preview">
      <section class="markdown-pane" :class="{ 'mobile-hidden': mobileTab !== 'markdown' }">
        <label>Treść Markdown<textarea ref="contentInput" v-model="content" rows="20" spellcheck="false" /></label>
        <button type="button" class="insert-coin-button" @click="showCoinPicker = true">Wstaw monetę</button>
      </section>
      <section class="preview-pane" :class="{ 'mobile-hidden': mobileTab !== 'preview' }">
        <h2>Podgląd</h2>
        <StoryRenderer :content="content" />
      </section>
    </div>

    <button type="submit">Zapisz</button>
  </form>
  <StoryCoinPicker v-if="showCoinPicker" @select="insertCoin" @close="showCoinPicker = false" />
</template>

<style scoped>
.editor{display:grid;gap:16px}.editor label{display:grid;gap:6px;color:#475569;font-size:14px;font-weight:600}.editor textarea{width:100%;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.5;padding:10px;box-sizing:border-box}.insert-coin-button{width:fit-content;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff}.editor input,.editor select{padding:9px 10px}.editor button{width:fit-content;padding:9px 14px;border:0;border-radius:6px;background:#2563eb;color:white}.editor-preview{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}.markdown-pane,.preview-pane{min-width:0;border:1px solid #dbe3ee;border-radius:8px;padding:14px}.preview-pane h2{margin:0 0 12px;font-size:18px}.mobile-tabs{display:none;gap:8px}.mobile-tabs button{background:white;color:#334155;border:1px solid #cbd5e1}.mobile-tabs button[aria-selected="true"]{background:#e2e8f0;font-weight:700}.mobile-hidden{display:block}
@media(max-width:800px){.mobile-tabs{display:flex}.editor-preview{display:block}.mobile-hidden{display:none}.markdown-pane,.preview-pane{border:0;padding:0}}
</style>
