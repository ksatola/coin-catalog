<script setup lang="ts">
import type { StoryPageTree } from '../types'
defineProps<{ nodes: StoryPageTree[]; activePath?: string }>()
const emit = defineEmits<{
  select: [path: string]
  edit: [id: number]
  move: [id: number, direction: 'up' | 'down']
  delete: [id: number]
}>()
</script>
<template>
  <ul class="tree">
    <li v-for="node in nodes" :key="node.id">
      <div class="node-row">
        <button class="node-link" type="button" :class="{ active: activePath === node.path }" @click="emit('select', node.path)">{{ node.title }}</button>
        <span class="node-actions">
          <button type="button" aria-label="Przenieś wyżej" @click="emit('move', node.id, 'up')">↑</button>
          <button type="button" aria-label="Przenieś niżej" @click="emit('move', node.id, 'down')">↓</button>
          <button type="button" aria-label="Edytuj stronę" @click="emit('edit', node.id)">Edytuj</button>
          <button type="button" aria-label="Usuń stronę" @click="emit('delete', node.id)">Usuń</button>
        </span>
      </div>
      <StoryTree
        v-if="node.children.length"
        :nodes="node.children"
        :active-path="activePath"
        @select="emit('select', $event)"
        @edit="emit('edit', $event)"
        @move="(id, direction) => emit('move', id, direction)"
        @delete="emit('delete', $event)"
      />
    </li>
  </ul>
</template>
<style scoped>
.tree { list-style:none; margin:0; padding:0; }
.tree .tree { padding-left:18px; }
.node-row { display:flex; align-items:center; gap:6px; padding:3px 0; }
.node-link { flex:1; border:0; background:transparent; padding:7px 8px; border-radius:6px; color:#334155; text-align:left; }
.node-link.active { background:#e2e8f0; color:#0f172a; font-weight:700; }
.node-actions { display:flex; gap:2px; }
.node-actions button { border:0; background:transparent; color:#64748b; padding:5px; }
</style>
