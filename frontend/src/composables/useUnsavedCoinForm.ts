import { ref } from 'vue'

const isDirty = ref(false)

export function useUnsavedCoinForm() {
  function markDirty(): void {
    isDirty.value = true
  }

  function markClean(): void {
    isDirty.value = false
  }

  return {
    isDirty,
    markDirty,
    markClean,
  }
}
