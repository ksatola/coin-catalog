<script setup lang="ts">
import { ref, watch } from 'vue'
import VueTreeDnd from 'vue-tree-dnd'
import StoryTreeItem, { type StoryTreeItem as DndStoryTreeItem } from './StoryTreeItem.vue'
import type { StoryPageTree } from '../types'

type DropPosition = 'before' | 'inside' | 'after'
type MoveMutation = {
  id: number | string
  targetId: number | string
  position: 'LEFT' | 'RIGHT' | 'FIRST_CHILD' | 'LAST_CHILD'
}

const props = defineProps<{
  nodes: StoryPageTree[]
  activePath?: string
}>()

const emit = defineEmits<{
  select: [path: string]
  edit: [id: number]
  reorderTo: [id: number, targetId: number, position: DropPosition]
  delete: [id: number]
}>()

const tree = ref<DndStoryTreeItem[]>([])

function buildTree(nodes: StoryPageTree[]): DndStoryTreeItem[] {
  return nodes.map((node) => ({
    ...node,
    expanded: true,
    activePath: props.activePath,
    onSelect: (path: string) => emit('select', path),
    onEdit: (id: number) => emit('edit', id),
    onDelete: (id: number) => emit('delete', id),
    children: buildTree(node.children),
  }))
}

function syncTree(): void {
  tree.value = buildTree(props.nodes)
}

type NodeLocation = {
  node: DndStoryTreeItem
  siblings: DndStoryTreeItem[]
  parent: DndStoryTreeItem | null
}

function findLocation(
  nodes: DndStoryTreeItem[],
  id: number,
  parent: DndStoryTreeItem | null = null,
): NodeLocation | null {
  for (const node of nodes) {
    if (node.id === id) return { node, siblings: nodes, parent }
    const child = findLocation(node.children, id, node)
    if (child) return child
  }
  return null
}

function applyMove(move: MoveMutation): void {
  const id = Number(move.id)
  const targetId = Number(move.targetId)
  const source = findLocation(tree.value, id)
  const target = findLocation(tree.value, targetId)

  if (!source || !target || source.node.id === target.node.id) return

  const sourceIndex = source.siblings.indexOf(source.node)
  if (sourceIndex < 0) return
  source.siblings.splice(sourceIndex, 1)

  if (move.position === 'FIRST_CHILD') {
    target.node.children.unshift(source.node)
    source.node.parent_id = target.node.id
    return
  }

  if (move.position === 'LAST_CHILD') {
    target.node.children.push(source.node)
    source.node.parent_id = target.node.id
    return
  }

  if (move.position === 'LEFT' || move.position === 'RIGHT') {
    const targetIndex = target.siblings.indexOf(target.node)
    if (targetIndex < 0) return

    const insertIndex = move.position === 'LEFT' ? targetIndex : targetIndex + 1
    source.node.parent_id = target.parent?.id ?? null
    target.siblings.splice(insertIndex, 0, source.node)
    return
  }

  target.node.children.push(source.node)
  source.node.parent_id = target.node.id
}

function handleMove(move: MoveMutation): void {
  applyMove(move)

  const id = Number(move.id)
  const targetId = Number(move.targetId)

  if (move.position === 'FIRST_CHILD') {
    const target = findLocation(tree.value, targetId)
    const firstChild = target?.node.children[0]
    if (firstChild && firstChild.id === id) {
      const actualTarget = target.node.children[1]
      if (actualTarget) {
        emit('reorderTo', id, actualTarget.id, 'before')
      } else {
        emit('reorderTo', id, targetId, 'inside')
      }
      return
    }
  }

  const position: DropPosition =
    move.position === 'LEFT'
      ? 'before'
      : move.position === 'RIGHT'
        ? 'after'
        : 'inside'

  emit('reorderTo', id, targetId, position)
}

watch(
  () => [props.nodes, props.activePath],
  syncTree,
  { immediate: true, deep: true },
)
</script>

<template>
  <div class="story-tree">
    <VueTreeDnd
      v-model="tree"
      :component="StoryTreeItem"
      :locked="false"
      @move="handleMove"
    />
  </div>
</template>

<style scoped>
.story-tree {
  min-width: 0;
}

.story-tree :deep(a[href="javascript:;"]) {
  display: block;
}

.story-tree :deep(a[href="javascript:;"]:focus-visible) {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-radius: 6px;
}
</style>
