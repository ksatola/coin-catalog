import { computed, reactive } from 'vue'

const state = reactive(new Set<number>())

export function useStoryCoinSelection() {
  return {
    add(id: number): void { state.add(id) },
    addMany(ids: number[]): void { ids.forEach((id) => state.add(id)) },
    remove(id: number): void { state.delete(id) },
    clear(): void { state.clear() },
    has(id: number): boolean { return state.has(id) },
    ids: computed(() => Array.from(state).sort((a, b) => a - b)),
  }
}
