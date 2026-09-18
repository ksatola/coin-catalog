import { expect, test, type Page } from '@playwright/test'

type Collection = {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
  coin_count: number
  archived_coin_count: number
  image_count: number
  file_size_bytes: number
  category_count: number
  coins_without_images_count: number
  last_modified_at: string
}

type CatalogCoin = {
  id: number
  collection_id: number
  collection_number: string
  from_year: number
  to_year: number
  archived: boolean
}

const initialCollections: Collection[] = [
  {
    id: 1,
    name: 'Monety polskie',
    description: 'Kolekcja podstawowa',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    coin_count: 428,
    archived_coin_count: 12,
    image_count: 791,
    file_size_bytes: 3 * 1024 * 1024 * 1024,
    category_count: 17,
    coins_without_images_count: 4,
    last_modified_at: '2026-09-16T10:42:00Z',
  },
]

const collectionCoins = [
  { id: 404, collection_id: 1, collection_number: 'PL-0404', from_year: 1924, to_year: 1924 },
]

const catalogCoins: CatalogCoin[] = [
  { id: 101, collection_id: 1, collection_number: 'PL-0101', from_year: 1924, to_year: 1924, archived: false },
  { id: 202, collection_id: 2, collection_number: 'DE-0202', from_year: 1925, to_year: 1925, archived: false },
  { id: 303, collection_id: 3, collection_number: 'EU-0303', from_year: 1926, to_year: 1926, archived: false },
  { id: 404, collection_id: 1, collection_number: 'PL-0404', from_year: 1924, to_year: 1924, archived: false },
  { id: 505, collection_id: 2, collection_number: 'DE-0505', from_year: 1930, to_year: 1930, archived: true },
]

function cloneCollections(): Collection[] {
  return initialCollections.map((collection) => ({ ...collection }))
}

async function mockCollectionApi(page: Page): Promise<void> {
  const state = cloneCollections()
  let nextId = 2

  await page.route('**/api/collections', async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state) })
      return
    }

    if (method === 'POST') {
      const body = route.request().postDataJSON() as { name: string; description: string | null }
      const collection: Collection = {
        id: nextId++, name: body.name.trim(), description: body.description,
        created_at: '2026-09-16T11:00:00Z', updated_at: '2026-09-16T11:00:00Z',
        coin_count: 0, archived_coin_count: 0, image_count: 0, file_size_bytes: 0,
        category_count: 0, coins_without_images_count: 0, last_modified_at: '2026-09-16T11:00:00Z',
      }
      state.push(collection)
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(collection) })
      return
    }

    await route.fallback()
  })

  await page.route('**/api/collections/*', async (route) => {
    const method = route.request().method()
    const pathname = new URL(route.request().url()).pathname
    const parts = pathname.split('/').filter(Boolean)
    const id = Number(parts[2])
    const collection = state.find((item) => item.id === id)

    if (!collection) {
      await route.fulfill({ status: 404, body: '' })
      return
    }

    if (parts.length === 4 && parts[3] === 'stats' && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(collection) })
      return
    }

    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(collection) })
      return
    }

    if (method === 'PUT') {
      const body = route.request().postDataJSON() as { name: string; description: string | null }
      collection.name = body.name.trim()
      collection.description = body.description
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(collection) })
      return
    }

    if (method === 'DELETE') {
      state.splice(state.indexOf(collection), 1)
      await route.fulfill({ status: 204, body: '' })
      return
    }

    await route.fallback()
  })

  await page.route('**/api/coins?collection_id=1', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(collectionCoins) })
  })
}

async function mockCatalogApi(page: Page): Promise<void> {
  const collections = [
    ...initialCollections,
    {
      id: 2,
      name: 'Monety niemieckie',
      description: null,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      coin_count: 2,
      archived_coin_count: 1,
      image_count: 4,
      file_size_bytes: 4096,
      category_count: 2,
      coins_without_images_count: 0,
      last_modified_at: '2026-09-15T10:00:00Z',
    },
    {
      id: 3,
      name: 'Monety europejskie',
      description: null,
      created_at: '2026-01-03T00:00:00Z',
      updated_at: '2026-01-03T00:00:00Z',
      coin_count: 1,
      archived_coin_count: 0,
      image_count: 2,
      file_size_bytes: 2048,
      category_count: 1,
      coins_without_images_count: 0,
      last_modified_at: '2026-09-14T10:00:00Z',
    },
  ]

  const dictionaries = {
    countries: [{ id: 1, name: 'Polska' }],
    issuers: [],
    denominations: [{ id: 1, name: '1 zł' }],
    mints: [],
    materials: [],
    states: [],
    eras: [{ id: 1, name: 'II RP' }],
  }

  await page.route('**/api/collections', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(collections) })
  })

  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() as keyof typeof dictionaries
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaries[name] ?? []) })
  })

  await page.route('**/api/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.route('**/api/coins?*', async (route) => {
    const params = new URL(route.request().url()).searchParams
    const selectedCollections = params.getAll('collection_id').map(Number)
    const status = params.get('status')
    const search = params.get('search')?.toLowerCase() ?? ''

    const filtered = catalogCoins.filter((coin) => {
      const collectionMatch = selectedCollections.length === 0 || selectedCollections.includes(coin.collection_id)
      const statusMatch = status === 'archived' ? coin.archived : status === 'active' ? !coin.archived : true
      const searchMatch = !search || coin.collection_number.toLowerCase().includes(search)
      return collectionMatch && statusMatch && searchMatch
    })

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(filtered) })
  })

  await page.route('**/api/coins', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalogCoins.filter((coin) => !coin.archived)) })
  })

  for (const coin of catalogCoins) {
    await page.route(`**/api/coins/${coin.id}/images`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
  }
}

test.describe('collections', () => {
  test('displays persisted collection statistics', async ({ page }) => {
    await mockCollectionApi(page)
    await page.goto('/kolekcje')

    await expect(page.getByRole('heading', { name: 'Kolekcje' })).toBeVisible()
    await page.getByRole('button', { name: 'Monety polskie' }).click()
    await expect(page.getByText('428', { exact: true })).toBeVisible()
    await expect(page.getByText('791', { exact: true })).toBeVisible()
    await expect(page.getByText('17', { exact: true })).toBeVisible()
    await expect(page.getByText('4', { exact: true })).toBeVisible()
    await expect(page.getByText('3.0 GB', { exact: true })).toBeVisible()
    await expect(page.getByText('16 września 2026')).toBeVisible()
  })

  test('creates, edits and deletes a collection', async ({ page }) => {
    await mockCollectionApi(page)
    await page.goto('/kolekcje')

    await page.getByRole('button', { name: 'Nowa kolekcja' }).first().click()
    await page.getByLabel('Nazwa').fill('Nowa kolekcja')
    await page.getByLabel('Opis').fill('Testowy opis')
    await page.getByRole('button', { name: 'Dodaj', exact: true }).click()

    await expect(page.getByRole('button', { name: 'Nowa kolekcja' }).first()).toBeVisible()
    await expect(page.getByLabel('Nazwa')).toHaveValue('Nowa kolekcja')
    await expect(page.getByLabel('Opis')).toHaveValue('Testowy opis')

    await page.getByLabel('Nazwa').fill('Zmieniona kolekcja')
    await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Zmieniona kolekcja' })).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Usuń kolekcję' }).click()
    await expect(page.getByRole('button', { name: 'Zmieniona kolekcja' })).toHaveCount(0)
  })

  test('shows collection detail and its coins', async ({ page }) => {
    await mockCollectionApi(page)
    await page.goto('/kolekcje/1')

    await expect(page.getByRole('heading', { name: 'Monety polskie' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Monety w kolekcji' })).toBeVisible()
    await expect(page.getByRole('link', { name: /#404/ })).toHaveAttribute('href', '/monety/404')
    await expect(page.getByRole('button', { name: 'Pokaż monety' })).toBeVisible()
  })

  test('filters catalog by one collection', async ({ page }) => {
    await mockCatalogApi(page)
    await page.goto('/monety')
    await page.getByRole('button', { name: '▦ Grid' }).click()

    await page.getByRole('button', { name: '⚙ Filtry' }).click()
    await page.getByLabel('Kolekcje').selectOption('1')
    await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()

    await expect(page.getByText('#101')).toBeVisible()
    await expect(page.getByText('#404')).toBeVisible()
    await expect(page.getByText('#202')).toHaveCount(0)
    await expect(page.getByText('#303')).toHaveCount(0)
  })

  test('filters catalog by multiple collections', async ({ page }) => {
    await mockCatalogApi(page)
    await page.goto('/monety')
    await page.getByRole('button', { name: '▦ Grid' }).click()

    await page.getByRole('button', { name: '⚙ Filtry' }).click()
    await page.getByLabel('Kolekcje').selectOption(['1', '2'])
    await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()

    await expect(page.getByText('#101')).toBeVisible()
    await expect(page.getByText('#202')).toBeVisible()
    await expect(page.getByText('#404')).toBeVisible()
    await expect(page.getByText('#303')).toHaveCount(0)
  })

  test('clearing filters restores all active collections', async ({ page }) => {
    await mockCatalogApi(page)
    await page.goto('/monety')
    await page.getByRole('button', { name: '▦ Grid' }).click()

    await page.getByRole('button', { name: '⚙ Filtry' }).click()
    await page.getByLabel('Kolekcje').selectOption('1')
    await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()
    await expect(page.getByText('#202')).toHaveCount(0)

    await page.getByRole('button', { name: 'Wyczyść filtry' }).click()

    await expect(page.getByText('#101')).toBeVisible()
    await expect(page.getByText('#202')).toBeVisible()
    await expect(page.getByText('#303')).toBeVisible()
    await expect(page.getByText('#404')).toBeVisible()
    await expect(page.getByText('#505')).toHaveCount(0)
  })

  test('combines collection filter with search', async ({ page }) => {
    await mockCatalogApi(page)
    await page.goto('/monety')
    await page.getByRole('button', { name: '▦ Grid' }).click()

    await page.getByRole('button', { name: '⚙ Filtry' }).click()
    await page.getByLabel('Kolekcje').selectOption('1')
    await page.getByRole('searchbox', { name: 'Szukaj', exact: true }).fill('PL-0404')
    await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()

    await expect(page.getByText('#404')).toBeVisible()
    await expect(page.getByText('#101')).toHaveCount(0)
    await expect(page.getByText('#202')).toHaveCount(0)
  })

  test('keeps collection scope in archive', async ({ page }) => {
    await mockCatalogApi(page)
    await page.goto('/archiwum')
    await page.getByRole('button', { name: '▦ Grid' }).click()

    await page.getByRole('button', { name: '⚙ Filtry' }).click()
    await page.getByLabel('Kolekcje').selectOption('2')
    await page.getByRole('button', { name: 'Szukaj / filtruj' }).click()

    await expect(page.getByText('#505')).toBeVisible()
    await expect(page.getByText('#101')).toHaveCount(0)
    await expect(page.getByText('#202')).toHaveCount(0)
  })

  test('opens collection coins from collection detail', async ({ page }) => {
    await mockCollectionApi(page)
    await mockCatalogApi(page)
    await page.goto('/kolekcje/1')

    await expect(page.getByRole('link', { name: /#404/ })).toBeVisible()
    await page.getByRole('button', { name: 'Pokaż monety' }).click()
    await expect(page).toHaveURL(/\/monety\?collection_id=1$/)
    await expect(page.getByText('#101')).toBeVisible()
    await expect(page.getByText('#404')).toBeVisible()
    await expect(page.getByText('#202')).toHaveCount(0)
  })
})
