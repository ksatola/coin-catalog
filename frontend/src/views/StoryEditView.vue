<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StoryEditor from '../components/StoryEditor.vue'
import type { StoryPage, StoryPageTree } from '../types'
const route=useRoute()
const router=useRouter()
const page=ref<StoryPage|null>(null)
const tree=ref<StoryPageTree[]>([])
const error=ref('')
const saving=ref(false)
function isNew():boolean { return route.params.id === 'nowa' }
async function load():Promise<void> {
  try {
    const treeResponse=await fetch('/api/story/pages/tree',{cache:'no-store'})
    if(!treeResponse.ok) throw new Error()
    tree.value=await treeResponse.json() as StoryPageTree[]
    if(!isNew()){
      const response=await fetch('/api/story/pages/' + route.params.id,{cache:'no-store'})
      if(!response.ok) throw new Error()
      page.value=await response.json() as StoryPage
    }
  } catch { error.value='Nie udało się wczytać strony.' }
}
async function save(payload:{title:string;parent_id:number|null;content:string}):Promise<void>{
  saving.value=true; error.value=''
  try{
    const response=await fetch(isNew()?'/api/story/pages':'/api/story/pages/' + route.params.id,{method:isNew()?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    if(!response.ok){error.value=(await response.json() as {detail?:string}).detail ?? 'Nie udało się zapisać strony.';return}
    const saved=await response.json() as StoryPage
    await router.push('/opowiesc/' + saved.path)
  } finally { saving.value=false }
}
onMounted(()=>void load())
</script>
<template>
  <section class="edit-page"><RouterLink to="/opowiesc">← Opowieść</RouterLink><h1>{{ isNew() ? 'Nowa strona' : 'Edytuj stronę' }}</h1><p v-if="error" class="error">{{ error }}</p><StoryEditor v-if="!saving" :page="page" :tree="tree" @save="save" /></section>
</template>
<style scoped>
.edit-page{max-width:900px;margin:0 auto}.edit-page>a{color:#2563eb;text-decoration:none}.edit-page h1{margin-bottom:20px}.error{color:#b91c1c;margin-bottom:16px}
</style>
