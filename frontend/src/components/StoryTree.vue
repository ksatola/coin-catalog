<script setup lang="ts">
import { ref, watch } from 'vue'
import type { StoryPageTree } from '../types'

const props = defineProps<{
  nodes: StoryPageTree[]
  activePath?: string
  nested?: boolean
}>()

const emit = defineEmits<{
  select: [path: string]
  edit: [id: number]
  reorderTo: [id: number, targetId: number, position: 'before' | 'inside' | 'after']
  delete: [id: number]
}>()

const expanded = ref<Set<number>>(new Set())
const dropTarget = ref<{ id: number; position: 'before' | 'inside' | 'after' } | null>(null)
const dragged = ref<{ id: number; path: string; parentId: number | null } | null>(null)

function resetExpanded(): void {
  expanded.value = new Set(
    props.nodes
      .filter((node) => node.children.length > 0)
      .map((node) => node.id),
  )
}

function expandActivePath(path?: string): void {
  if (!path) return

  const next = new Set(expanded.value)
  for (const node of props.nodes) {
    if (node.children.length > 0 && (path === node.path || path.startsWith(node.path + '/'))) {
      next.add(node.id)
    }
  }
  expanded.value = next
}

function toggle(node: StoryPageTree): void {
  const next = new Set(expanded.value)
  if (next.has(node.id)) {
    next.delete(node.id)
  } else {
    next.add(node.id)
  }
  expanded.value = next
}

function startDrag(event: DragEvent, node: StoryPageTree): void {
  if (!event.dataTransfer) return
  dragged.value = { id: node.id, path: node.path, parentId: node.parent_id }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', JSON.stringify(dragged.value))
}

function dragOver(node: StoryPageTree, event: DragEvent): void {
  if (!event.dataTransfer || !dragged.value) return
  if (dragged.value.id === node.id || node.path.startsWith(dragged.value.path + '/')) return

  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const relativeY = event.clientY - rect.top
  const ratio = relativeY / rect.height

  let position: 'before' | 'inside' | 'after'
  if (ratio < 0.25) {
    position = 'before'
  } else if (ratio > 0.75) {
    position = 'after'
  } else {
    position = 'inside'
  }

  dropTarget.value = { id: node.id, position }
}

function finishDrag(): void {
  dropTarget.value = null
  dragged.value = null
}

function drop(event: DragEvent, node: StoryPageTree): void {
  event.preventDefault()
  const target = dropTarget.value
  const payload = dragged.value
  dropTarget.value = null

  if (!target || !payload || target.id !== node.id) {
    dragged.value = null
    return
  }

  if (payload.id === node.id || node.path.startsWith(payload.path + '/')) {
    dragged.value = null
    return
  }

  emit('reorderTo', payload.id, node.id, target.position)
  dragged.value = null
}

watch(() => props.nodes, resetExpanded, { immediate: true })
watch(() => props.activePath, expandActivePath, { immediate: true })
</script>

<template>
  <ul class="tree" :class="{ nested: nested }">
    <li v-for="node in nodes" :key="node.id" class="tree-item">
      <div
        class="node-row"
        :class="{
          'drop-target-before': dropTarget?.id === node.id && dropTarget.position === 'before',
          'drop-target-inside': dropTarget?.id === node.id && dropTarget.position === 'inside',
          'drop-target-after': dropTarget?.id === node.id && dropTarget.position === 'after',
        }"
        @dragover="dragOver(node, $event)"
        @drop="drop($event, node)"
      >
        <button
          v-if="node.children.length"
          class="expand-toggle"
          type="button"
          :aria-label="expanded.has(node.id) ? 'Zwiń ' + node.title : 'Rozwiń ' + node.title"
          :aria-expanded="expanded.has(node.id)"
          @click="toggle(node)"
        >
          {{ expanded.has(node.id) ? '▾' : '▸' }}
        </button>
        <span v-else class="expand-placeholder" aria-hidden="true"></span>

        <button
          class="node-link"
          type="button"
          :class="{ active: activePath === node.path }"
          :aria-current="activePath === node.path ? 'page' : undefined"
          draggable="true"
          @dragstart="startDrag($event, node)"
          @dragend="finishDrag"
          @click="emit('select', node.path)"
        >
          <span class="node-title">{{ node.title }}</span>
        </button>

        <span class="node-actions">
          <button type="button" aria-label="Edytuj stronę" @click="emit('edit', node.id)">Edytuj</button>
          <button type="button" aria-label="Usuń stronę" @click="emit('delete', node.id)">Usuń</button>
        </span>
      </div>

      <StoryTree
        v-if="node.children.length && expanded.has(node.id)"
        :nodes="node.children"
        :active-path="activePath"
        :nested="true"
        @select="emit('select', $event)"
        @edit="emit('edit', $event)"
        @reorder-to="(id, targetId, position) => emit('reorderTo', id, targetId, position)"
        @delete="emit('delete', $event)"
      />
    </li>
  </ul>
</template>

<style scoped>
.tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tree.nested {
  margin-left: 12px;
  padding-left: 14px;
}

.tree.nested .tree-item {
  position: relative;
}

.tree.nested .tree-item::before {
  content: '';
  position: absolute;
  top: 19px;
  left: -14px;
  width: 14px;
  border-top: 1px solid #cbd5e1;
}

.tree.nested .tree-item::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -14px;
  border-left: 1px solid #cbd5e1;
}

.tree.nested .tree-item:last-child::after {
  bottom: calc(100% - 19px);
}

.node-row {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 3px;
  padding: 2px 0;
}

.expand-toggle,
.expand-placeholder {
  flex: 0 0 24px;
  width: 24px;
  height: 30px;
}

.expand-toggle {
  border: 0;
  background: transparent;
  color: #64748b;
  padding: 0;
  font-size: 14px;
  line-height: 30px;
  cursor: pointer;
}

.expand-toggle:hover {
  color: #0f172a;
}

.node-link {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 6px 8px;
  border-radius: 6px;
  color: #334155;
  text-align: left;
  cursor: pointer;
}

.node-title {
  display: block;
  overflow-wrap: anywhere;
}

.node-link:hover {
  background: #f1f5f9;
}

.node-link[draggable="true"] {
  cursor: grab;
}

.node-link[draggable="true"]:active {
  cursor: grabbing;
}

.node-row.drop-target-before::before,
.node-row.drop-target-after::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #2563eb;
  pointer-events: none;
  z-index: 2;
}

.node-row.drop-target-before::before {
  top: -2px;
}

.node-row.drop-target-after::after {
  bottom: -2px;
}

.node-row.drop-target-inside .node-link {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
  background: #eff6ff;
}

.node-link.active {
  background: #e2e8f0;
  color: #0f172a;
  font-weight: 700;
}

.node-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 1px;
}

.node-actions button {
  border: 0;
  background: transparent;
  color: #64748b;
  padding: 5px 4px;
  font-size: 12px;
  cursor: pointer;
}

.node-actions button:hover {
  color: #0f172a;
  background: #f1f5f9;
  border-radius: 4px;
}
</style>
