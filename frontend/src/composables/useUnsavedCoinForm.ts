import { ref } from 'vue'

const dirtyForms = ref(new Set<'create' | 'edit'>())

export function useUnsavedCoinForm(formType?: 'create' | 'edit') {
  function markDirty(): void {
    if (formType) dirtyForms.value.add(formType)
  }

  function markClean(): void {
    if (formType) dirtyForms.value.delete(formType)
  }

  return {
    isDirty: formType ? { get value() { return dirtyForms.value.has(formType) } } : dirtyForms,
    markDirty,
    markClean,
  }
}
