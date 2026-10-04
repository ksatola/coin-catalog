import { ref } from 'vue'

const query = ref<string | null>(null)

export function useStoryCoinCatalogScope() {
  return {
    query,
    setQuery(value: string): void {
      query.value = value
    },
    clear(): void {
      query.value = null
    },
  }
}
