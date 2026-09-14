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
const localPreviewUrl = ref<string | null>(props.multiple ? null : (props.previewUrl ?? null))

function revokeLocalPreview(): void {
  if (localPreviewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(localPreviewUrl.value)
  }
}

watch(
  () => props.previewUrl,
  (previewUrl) => {
    if (props.multiple) {
      return
    }

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

  if (props.multiple) {
    emit('files', validFiles)
    return
  }

  const firstFile = validFiles.at(0)
  if (!firstFile) {
    return
  }

  if (localPreviewUrl.value?.startsWith('blob:')) {
    revokeLocalPreview()
  }

  localPreviewUrl.value = URL.createObjectURL(firstFile)
  emit('files', [firstFile])
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
  if (props.multiple) {
    return
  }

  revokeLocalPreview()
  localPreviewUrl.value = null
  emit('clear')
}

onBeforeUnmount(revokeLocalPreview)
</script>

<template>
  <section
    class="image-drop-zone"
    :class="{ dragging: isDragging, 'has-image': localPreviewUrl }"
    tabindex="0"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop="handleDrop"
    @paste="handlePaste"
  >
    <div v-if="localPreviewUrl" class="image-preview-wrapper">
      <img
        class="image-preview"
        :src="localPreviewUrl"
        :alt="title"
      />

      <button type="button" @click="clearImage">
        Usuń zdjęcie
      </button>
    </div>

    <div v-else class="drop-content">
      <strong>{{ title }}</strong>
      <span>Przeciągnij JPG lub wklej Ctrl+V</span>

      <span v-if="multiple && pendingCount">
        Wybrano zdjęć: {{ pendingCount }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.image-drop-zone {
  width: 100px;
  height: 100px;
  min-height: 0;
  aspect-ratio: 1 / 1;
  border: 2px dashed #9ca3af;
  border-radius: 8px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: default;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  outline: none;
}

.image-drop-zone:focus-visible {
  border-color: #2563eb;
}

.image-drop-zone.dragging {
  border-color: #2563eb;
  background: #eff6ff;
}

.image-drop-zone.has-image {
  border-style: solid;
  background: #111827;
}

.drop-content {
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  font-size: 0.75rem;
}

.drop-content strong {
  font-size: 0.8rem;
}

.drop-content span {
  color: #4b5563;
}

.image-preview-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.image-preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-preview-wrapper button {
  position: absolute;
  right: 4px;
  bottom: 4px;
  font-size: 0.7rem;
  padding: 3px 5px;
}
</style>
