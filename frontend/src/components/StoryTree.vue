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

function findNode(nodes: DndStoryTreeItem[], id: number): DndStoryTreeItem | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = findNode(node.children, id)
    if (child) return child
  }
  return null
}

function handleMove(move: MoveMutation): void {
  const id = Number(move.id)
  const targetId = Number(move.targetId)

  if (move.position === 'FIRST_CHILD') {
    const target = findNode(tree.value, targetId)
    const firstChild = target?.children[0]
    if (firstChild) {
      emit('reorderTo', id, firstChild.id, 'before')
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
