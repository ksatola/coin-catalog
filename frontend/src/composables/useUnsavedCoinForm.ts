import { computed, ref } from 'vue'

const dirtyForms = ref(new Set<'create' | 'edit'>())

export function useUnsavedCoinForm(formType: 'create' | 'edit') {
  const isDirty = computed(() => dirtyForms.value.has(formType))

  function markDirty(): void {
    dirtyForms.value.add(formType)
  }

  function markClean(): void {
    dirtyForms.value.delete(formType)
  }

  return { isDirty, markDirty, markClean }
}
