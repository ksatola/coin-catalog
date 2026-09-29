import { expect, test } from '@playwright/test'

const dictionaries = {
  countries: [{ id: 1, name: 'Kraj testowy' }],
  issuers: [{ id: 1, name: 'Emitent testowy' }],
  denominations: [{ id: 1, name: 'Denar' }],
  mints: [{ id: 1, name: 'Mennica testowa' }],
  materials: [],
  states: [{ id: 1, name: 'Stan testowy' }],
  eras: [{ id: 1, name: 'Era testowa' }],
  acquisition_methods: [{ id: 1, name: 'Aukcja' }],
}

const collections = [
  { id: 1, name: 'Kolekcja 1', description: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
]

const categories = [
  { id: 1, name: 'Średniowiecze', description: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
]

const coin = {
  id: 1,
  country_id: 1,
  issuer_id: 1,
  denomination_id: 1,
  from_year: 1080,
  from_era_id: 1,
  to_year: 1080,
  to_era_id: 1,
  mint_id: 1,
  material_id: null,
  state_id: 1,
  description: 'Opis',
  avers_description: 'Awers',
  revers_description: 'Rewers',
  literature: 'Literatura',
  acquisition_method_id: 1,
  acquisition_method_text: 'Opis własny',
  purchase_price: null,
  purchase_date: null,
  weight: 1,
  diameter: 14.21,
  collection_number: '6',
  source: null,
  has_video: false,
  archived: false,
  collection_id: 1,
}

const coinImages = [
  { id: 1, coin_id: 1, filename: 'avers.jpg', kind: 'avers', sort_order: 0, file_size_bytes: 1000, created_at: '2026-01-01T00:00:00' },
  { id: 2, coin_id: 1, filename: 'rewers.jpg', kind: 'rewers', sort_order: 0, file_size_bytes: 1000, created_at: '2026-01-01T00:00:00' },
  { id: 3, coin_id: 1, filename: 'dodatkowe.jpg', kind: 'additional', sort_order: 0, file_size_bytes: 1000, created_at: '2026-01-01T00:00:00' },
]

async function mockDictionaries(page: Parameters<typeof test>[0]['page']): Promise<void> {
  await page.route('**/api/dictionaries/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() as keyof typeof dictionaries
    await route.fulfill({ json: dictionaries[name] ?? [] })
  })
}

test('widok dodaj monetę ma kolejność Kolekcja, Kategorie, Zdjęcia i tylko jeden nagłówek strony', async ({ page }) => {
  await mockDictionaries(page)
  await page.route('**/api/collections', async (route) => await route.fulfill({ json: collections }))
  await page.route('**/api/categories', async (route) => await route.fulfill({ json: categories }))

  await page.goto('/dodaj')

  await expect(page.getByRole('heading', { name: 'Dodaj monetę', exact: true })).toHaveCount(1)

  const headings = await page.locator('h1, h2, h3').allTextContents()
  const collectionIndex = headings.indexOf('Kolekcja')
  const categoryIndex = headings.indexOf('Kategorie')
  const imagesIndex = headings.indexOf('Zdjęcia')

  expect(collectionIndex).toBeGreaterThanOrEqual(0)
  expect(categoryIndex).toBeGreaterThan(collectionIndex)
  expect(imagesIndex).toBeGreaterThan(categoryIndex)

  const setupSections = page.locator('.setup-sections')
  await expect(setupSections).toHaveCSS('gap', '24px')
})

test('widok edycji monety ma kolejność Kolekcja, Kategorie, Zdjęcia', async ({ page }) => {
  await mockDictionaries(page)
  await page.route('**/api/collections', async (route) => await route.fulfill({ json: collections }))
  await page.route('**/api/categories', async (route) => await route.fulfill({ json: categories }))
  await page.route('**/api/coins/1', async (route) => await route.fulfill({ json: coin }))
  await page.route('**/api/coins/1/images', async (route) => await route.fulfill({ json: coinImages }))

  await page.goto('/monety/1/edytuj')

  const headings = await page.locator('h1, h2, h3').allTextContents()
  const collectionIndex = headings.indexOf('Kolekcja')
  const categoryIndex = headings.indexOf('Kategorie')
  const imagesIndex = headings.indexOf('Zdjęcia')

  expect(collectionIndex).toBeGreaterThanOrEqual(0)
  expect(categoryIndex).toBeGreaterThan(collectionIndex)
  expect(imagesIndex).toBeGreaterThan(categoryIndex)

  await expect(page.locator('.setup-sections')).toHaveCSS('gap', '24px')
})

test('read-only ma białe sekcje dla zdjęć dodatkowych i kategorii oraz spójny odstęp', async ({ page }) => {
  await mockDictionaries(page)
  await page.route('**/api/collections/1', async (route) => await route.fulfill({ json: collections[0] }))
  await page.route('**/api/coins/1/images', async (route) => await route.fulfill({ json: coinImages }))
  await page.route('**/api/coins/1', async (route) => await route.fulfill({ json: coin }))
  await page.route('**/api/coins/1/categories', async (route) => await route.fulfill({ json: categories }))

  await page.goto('/monety/1')

  await expect(page.locator('.additional-images')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('.coin-categories')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('.coin-detail')).toHaveCSS('gap', '28px')
  await expect(page.locator('.detail-actions')).toHaveCSS('margin-top', '28px')
})
