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
  moveTo: [id: number, parentId: number]
  reorderTo: [id: number, targetId: number, position: 'before' | 'after']
  delete: [id: number]
}>()

const expanded = ref<Set<number>>(new Set())
const dropTarget = ref<{ id: number; position: 'before' | 'after' } | null>(null)

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
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(
    'text/plain',
    JSON.stringify({ id: node.id, path: node.path, parentId: node.parent_id }),
  )
}

function dragOver(node: StoryPageTree, event: DragEvent): void {
  if (!event.dataTransfer) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  dropTarget.value = { id: node.id, position }
}

function drop(event: DragEvent, node: StoryPageTree): void {
  event.preventDefault()
  const position = dropTarget.value?.id === node.id ? dropTarget.value.position : 'after'
  dropTarget.value = null
  const raw = event.dataTransfer?.getData('text/plain')
  if (!raw) return

  try {
    const payload = JSON.parse(raw) as { id?: number; path?: string; parentId?: number | null }
    if (
      typeof payload.id !== 'number'
      || payload.id === node.id
      || typeof payload.path !== 'string'
      || node.path.startsWith(payload.path + '/')
    ) {
      return
    }

    if (payload.parentId === node.parent_id) {
      emit('reorderTo', payload.id, node.id, position)
    } else {
      emit('moveTo', payload.id, node.id)
    }
  } catch {
    // Ignore malformed drag payloads.
  }
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
          'drop-target-after': dropTarget?.id === node.id && dropTarget.position === 'after',
        }"
        @dragover="dragOver(node, $event)"
        @dragleave="dropTarget = null"
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
          @dragend="dropTarget = null"
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
        @move-to="(id, parentId) => emit('moveTo', id, parentId)"
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

.node-row.drop-target-before,
.node-row.drop-target-after {
  position: relative;
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
}

.node-row.drop-target-before::before {
  top: -1px;
}

.node-row.drop-target-after::after {
  bottom: -1px;
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
