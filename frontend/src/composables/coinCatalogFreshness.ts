type CatalogScope = 'coins' | 'archive'

function staleKey(scope: CatalogScope): string {
  return `coin-catalog:stale:${scope}`
}

export function markCoinCatalogStale(scope: CatalogScope): void {
  sessionStorage.setItem(staleKey(scope), 'true')
}

export function consumeCoinCatalogStale(scope: CatalogScope): boolean {
  const key = staleKey(scope)
  const stale = sessionStorage.getItem(key) === 'true'
  sessionStorage.removeItem(key)
  return stale
}
