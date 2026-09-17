import { ref } from 'vue'

const isDirty = ref(false)
const allowNextNavigation = ref(false)

export function useUnsavedCoinForm() {
  function markDirty(): void {
    isDirty.value = true
  }

  function markClean(): void {
    isDirty.value = false
  }

  function allowNavigation(): void {
    allowNextNavigation.value = true
  }

  function consumeNavigationAllowance(): boolean {
    if (!allowNextNavigation.value) return false
    allowNextNavigation.value = false
    return true
  }

  return { isDirty, markDirty, markClean, allowNavigation, consumeNavigationAllowance }
}
