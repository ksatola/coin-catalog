<script setup lang="ts">
import type { StoryPageTree } from '../types'

export type StoryTreeItem = StoryPageTree & {
  expanded: boolean
  children: StoryTreeItem[]
  onSelect: (path: string) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  activePath?: string
}

defineProps<{
  item: StoryTreeItem
  depth: number
  expanded: boolean
  setExpanded: (value: boolean) => void
}>()
</script>

<template>
  <div class="tree-item" :style="{ '--tree-depth': depth }">
    <div class="node-row">
      <button
        v-if="item.children.length"
        class="expand-toggle"
        type="button"
        :aria-label="expanded ? 'Zwiń ' + item.title : 'Rozwiń ' + item.title"
        :aria-expanded="expanded"
        @click.stop="setExpanded(!expanded)"
      >
        {{ expanded ? '▾' : '▸' }}
      </button>
      <span v-else class="expand-placeholder" aria-hidden="true"></span>

      <span class="drag-handle" aria-hidden="true">⋮⋮</span>

      <button
        class="node-link"
        type="button"
        :class="{ active: item.path === item.activePath }"
        :aria-current="item.path === item.activePath ? 'page' : undefined"
        @click.stop="item.onSelect(item.path)"
      >
        <span class="node-title">{{ item.title }}</span>
      </button>

      <span class="node-actions">
        <button type="button" aria-label="Edytuj stronę" @click.stop="item.onEdit(item.id)">Edytuj</button>
        <button type="button" aria-label="Usuń stronę" @click.stop="item.onDelete(item.id)">Usuń</button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.tree-item {
  position: relative;
  padding-left: calc(var(--tree-depth) * 26px);
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

.drag-handle {
  flex: 0 0 18px;
  width: 18px;
  color: #94a3b8;
  font-size: 16px;
  line-height: 30px;
  text-align: center;
  cursor: grab;
  user-select: none;
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

.node-link:hover {
  background: #f1f5f9;
}

.node-title {
  display: block;
  overflow-wrap: anywhere;
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

/*
 * vue-tree-dnd renders its own drag ghost at the exact proposed drop
 * position and adjusts its depth for FIRST_CHILD/LAST_CHILD.
 * Make that library-provided ghost visible and remove the old tree lines.
 */
:global(.story-tree) :deep(a[style*="opacity: 0.3"]) {
  opacity: 1 !important;
  pointer-events: none;
}

:global(.story-tree) :deep(a[style*="opacity: 0.3"] .tree-item) {
  padding-top: 2px;
  padding-bottom: 2px;
}

:global(.story-tree) :deep(a[style*="opacity: 0.3"] .node-row) {
  border: 1px dashed #64748b;
  border-radius: 6px;
  background: #f8fafc;
}

:global(.story-tree) :deep(a[style*="opacity: 0.3"] .node-link) {
  color: #475569;
  font-weight: 600;
}

:global(.story-tree) :deep(a[style*="opacity: 0.3"] .drag-handle) {
  color: #64748b;
}
</style>
