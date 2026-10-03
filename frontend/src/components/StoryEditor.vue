<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { StoryPage, StoryPageTree } from '../types'
const props = defineProps<{ page: StoryPage | null; tree: StoryPageTree[] }>()
const emit = defineEmits<{ save: [payload: { title: string; parent_id: number | null; content: string }] }>()
const title = ref('')
const parentId = ref<number | null>(null)
const content = ref('')
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
    <label>Treść Markdown<textarea v-model="content" rows="20" spellcheck="false" /></label>
    <button type="submit">Zapisz</button>
  </form>
</template>
<style scoped>
.editor{display:grid;gap:16px}.editor label{display:grid;gap:6px;color:#475569;font-size:14px;font-weight:600}.editor textarea{width:100%;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.5;padding:10px}.editor input,.editor select{padding:9px 10px}.editor button{width:fit-content;padding:9px 14px;border:0;border-radius:6px;background:#2563eb;color:white}
</style>
