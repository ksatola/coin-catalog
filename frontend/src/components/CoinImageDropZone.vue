<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  title: string
  previewUrl?: string | null
  multiple?: boolean
  pendingCount?: number
}>()

const emit = defineEmits<{
  files: [files: File[]]
  clear: []
}>()

const isDragging = ref(false)
const localPreviewUrl = ref<string | null>(props.previewUrl ?? null)

function revokeLocalPreview(): void {
  if (localPreviewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(localPreviewUrl.value)
  }
}

watch(
  () => props.previewUrl,
  (previewUrl) => {
    revokeLocalPreview()
    localPreviewUrl.value = previewUrl ?? null
  },
)

function acceptedFiles(files: File[]): File[] {
  return files.filter((file) => file.type === 'image/jpeg')
}

function acceptFiles(files: File[]): void {
  const validFiles = acceptedFiles(files)
  if (validFiles.length === 0) {
    return
  }

  if (localPreviewUrl.value?.startsWith('blob:')) {
    revokeLocalPreview()
  }

  const firstFile = validFiles[0]
  localPreviewUrl.value = URL.createObjectURL(firstFile)
  emit('files', props.multiple ? validFiles : [firstFile])
}

function handleDrop(event: DragEvent): void {
  event.preventDefault()
  isDragging.value = false
  acceptFiles(Array.from(event.dataTransfer?.files ?? []))
}

function handlePaste(event: ClipboardEvent): void {
  const files = Array.from(event.clipboardData?.files ?? [])
  if (files.length > 0) {
    event.preventDefault()
    acceptFiles(files)
  }
}

function clearImage(): void {
  revokeLocalPreview()
  localPreviewUrl.value = null
  emit('clear')
}

onBeforeUnmount(revokeLocalPreview)
</script>

<template>
  <section
    class="image-drop-zone"
    :class="{ dragging: isDragging }"
    tabindex="0"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop="handleDrop"
    @paste="handlePaste"
  >
    <h3>{{ title }}</h3>

    <img
      v-if="localPreviewUrl"
      class="image-preview"
      :src="localPreviewUrl"
      :alt="title"
    />

    <p v-else>
      Przeciągnij JPG tutaj lub kliknij obszar i wklej przez Ctrl+V.
    </p>

    <p v-if="multiple && pendingCount">
      Wybrano dodatkowych zdjęć: {{ pendingCount }}
    </p>

    <button v-if="localPreviewUrl" type="button" @click="clearImage">
      Usuń zdjęcie
    </button>
  </section>
</template>
