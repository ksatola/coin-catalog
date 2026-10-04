<script setup lang="ts">
import { inject, provide, ref, watch } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import type { StoryPageTree } from '../types'

type DropPosition = 'before' | 'inside' | 'after'
type DropTarget = { id: number; position: DropPosition }
type DraggedPage = { id: number; path: string }

type StoryTreeDnd = {
  dragged: Ref<DraggedPage | null>
  dropTarget: Ref<DropTarget | null>
  dragging: Ref<boolean>
  setRoot: (element: Element | null) => void
  start: (node: StoryPageTree, event: PointerEvent) => void
  stop: (event: PointerEvent) => void
}

const props = defineProps<{
  nodes: StoryPageTree[]
  activePath?: string
  nested?: boolean
}>()

const emit = defineEmits<{
  select: [path: string]
  edit: [id: number]
  reorderTo: [id: number, targetId: number, position: DropPosition]
  delete: [id: number]
}>()

const expanded = ref<Set<number>>(new Set())

const STORY_TREE_DND_KEY = Symbol('story-tree-dnd') as InjectionKey<StoryTreeDnd>

function createDnd(): StoryTreeDnd {
  const dragged = ref<DraggedPage | null>(null)
  const dropTarget = ref<DropTarget | null>(null)
  const dragging = ref(false)
  const root = ref<HTMLElement | null>(null)
  let pointerId: number | null = null

  function setRoot(element: Element | null): void {
    if (element) root.value = element as HTMLElement
  }

  function clear(): void {
    dragged.value = null
    dropTarget.value = null
    dragging.value = false
    pointerId = null
    document.body.classList.remove('story-tree-dragging')
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
  }

  function isInvalidTarget(target: HTMLElement): boolean {
    const targetPath = target.dataset.nodePath ?? ''
    return (
      !targetPath ||
      !dragged.value ||
      Number(target.dataset.nodeId) === dragged.value.id ||
      targetPath.startsWith(dragged.value.path + '/')
    )
  }

  function findTarget(event: PointerEvent): DropTarget | null {
    const container = root.value
    if (!container || !dragged.value) return null

    const rows = Array.from(
      container.querySelectorAll<HTMLElement>('.node-row[data-node-id]'),
    )
    if (!rows.length) return null

    const y = event.clientY
    const hovered = rows.find((row) => {
      const rect = row.getBoundingClientRect()
      return y >= rect.top && y <= rect.bottom
    })

    if (hovered) {
      const rect = hovered.getBoundingClientRect()
      const ratio = (y - rect.top) / rect.height
      const position: DropPosition =
        ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside'
      return { id: Number(hovered.dataset.nodeId), position }
    }

    let previous: HTMLElement | null = null
    let next: HTMLElement | null = null

    for (const row of rows) {
      const rect = row.getBoundingClientRect()
      if (rect.bottom < y) {
        previous = row
        continue
      }
      if (rect.top > y) {
        next = row
        break
      }
    }

    if (next) return { id: Number(next.dataset.nodeId), position: 'before' }
    if (previous) return { id: Number(previous.dataset.nodeId), position: 'after' }
    return null
  }

  function onPointerMove(event: PointerEvent): void {
    if (!dragged.value || (pointerId !== null && event.pointerId !== pointerId)) return
    dropTarget.value = findTarget(event)
  }

  function finish(event: PointerEvent): void {
    if (!dragged.value || (pointerId !== null && event.pointerId !== pointerId)) {
      clear()
      return
    }

    const target = dropTarget.value
    const targetRow = target
      ? root.value?.querySelector<HTMLElement>(
          `.node-row[data-node-id="${target.id}"]`,
        )
      : null

    if (target && targetRow && !isInvalidTarget(targetRow)) {
      emit('reorderTo', dragged.value.id, target.id, target.position)
    }

    clear()
  }

  function onPointerUp(event: PointerEvent): void {
    finish(event)
  }

  function onPointerCancel(): void {
    clear()
  }

  function start(node: StoryPageTree, event: PointerEvent): void {
    if (dragging.value) return

    pointerId = event.pointerId
    dragged.value = { id: node.id, path: node.path }
    dropTarget.value = null
    dragging.value = true
    event.currentTarget instanceof HTMLElement
      ? event.currentTarget.setPointerCapture?.(event.pointerId)
      : undefined
    document.body.classList.add('story-tree-dragging')
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }

  function stop(event: PointerEvent): void {
    finish(event)
  }

  return { dragged, dropTarget, dragging, setRoot, start, stop }
}

const injectedDnd = inject(STORY_TREE_DND_KEY, null)
const dnd = injectedDnd ?? createDnd()

if (!injectedDnd) {
  provide(STORY_TREE_DND_KEY, dnd)
}

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

function setTreeRoot(element: Element | null): void {
  if (!props.nested) dnd.setRoot(element)
}

watch(() => props.nodes, resetExpanded, { immediate: true })
watch(() => props.activePath, expandActivePath, { immediate: true })
</script>

<template>
  <ul
    class="tree"
    :class="{ nested: nested, 'story-tree-root': !nested }"
    :ref="!nested ? setTreeRoot : undefined"
  >
    <li v-for="node in nodes" :key="node.id" class="tree-item">
      <div
        class="node-row"
        :data-node-id="node.id"
        :data-node-path="node.path"
        :class="{
          'drop-target-before': dnd.dropTarget?.id === node.id && dnd.dropTarget.position === 'before',
          'drop-target-inside': dnd.dropTarget?.id === node.id && dnd.dropTarget.position === 'inside',
          'drop-target-after': dnd.dropTarget?.id === node.id && dnd.dropTarget.position === 'after',
          'drop-invalid': dnd.dragging && dnd.dropTarget?.id === node.id && (node.id === dnd.dragged?.id || node.path.startsWith((dnd.dragged?.path ?? '') + '/')),
          'is-dragged': dnd.dragged?.id === node.id,
        }"
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

        <span
          class="drag-handle"
          role="button"
          tabindex="0"
          aria-label="Przeciągnij stronę"
          @pointerdown.prevent.stop="dnd.start(node, $event)"
          @pointerup.stop="dnd.stop($event)"
        >⋮⋮</span>

        <button
          class="node-link"
          type="button"
          :class="{ active: activePath === node.path }"
          :aria-current="activePath === node.path ? 'page' : undefined"
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

.drag-handle {
  flex: 0 0 18px;
  width: 18px;
  color: #94a3b8;
  font-size: 16px;
  line-height: 30px;
  text-align: center;
  cursor: grab;
  user-select: none;
  touch-action: none;
  -webkit-user-drag: none;
}

.drag-handle:hover {
  color: #475569;
}

.drag-handle:active,
.story-tree-dragging .drag-handle {
  cursor: grabbing;
}

:global(body.story-tree-dragging) {
  cursor: grabbing;
}

:global(body.story-tree-dragging) .drag-handle {
  cursor: grabbing;
}

.node-row.is-dragged {
  opacity: 0.55;
}

.node-row.drop-invalid {
  cursor: not-allowed;
}

.node-row.drop-invalid .node-link {
  cursor: not-allowed;
  opacity: 0.65;
}

.node-row .node-actions,
.node-row .expand-toggle {
  cursor: default;
}

.node-row.drop-target-before::before,
.node-row.drop-target-after::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: #2563eb;
  pointer-events: none;
  z-index: 2;
  border-radius: 2px;
}

.node-row.drop-target-before::before {
  top: -3px;
}

.node-row.drop-target-after::after {
  bottom: -3px;
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
